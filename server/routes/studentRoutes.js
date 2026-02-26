const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/authMiddleware");
const db = require("../db");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

/* ======== helper: build convention filename ======== */
function buildMobilityName(meta, index) {
  const city = (meta.city || "UNK").toUpperCase().substring(0, 3).padEnd(3, "X");
  const camera = (meta.camera || "FC").toUpperCase();
  const date = meta.date || new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const frame = "F" + String(index).padStart(3, "0");
  const ext = meta.ext || "jpg";
  return `MOB_${city}_${camera}_${date}_${frame}.${ext}`;
}

function buildRetailName(meta, index) {
  const client   = (meta.client   || "Client").replace(/\s+/g, "");
  const storeId  = (meta.storeId  || "STR0001");
  const category = (meta.category || "General").replace(/\s+/g, "");
  const product  = (meta.product  || "Product").replace(/\s+/g, "");
  const shelf    = (meta.shelf    || "Shelf1");
  const angle    = (meta.angle    || "Front");
  const date     = meta.date || new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seq      = String(index).padStart(2, "0");
  const ext      = meta.ext || "jpg";
  return `${client}_${storeId}_${category}_${product}_${shelf}_${angle}_${date}_${seq}.${ext}`;
}

function buildAgriName(meta, index) {
  const cropName          = (meta.cropName || "Crop").replace(/\s+/g, "");
  const state             = (meta.state || "State").replace(/\s+/g, "");
  const district          = (meta.district || "District").replace(/\s+/g, "");
  const date              = meta.date || (() => {
    const d = new Date();
    return String(d.getDate()).padStart(2, "0") +
           String(d.getMonth() + 1).padStart(2, "0") +
           d.getFullYear();
  })();
  const observedCondition = (meta.observedCondition || "normalGrowth").replace(/\s+/g, "");
  const ext               = meta.ext || "jpg";
  return `${cropName}_${state}_${district}_${date}_${observedCondition}.${ext}`;
}

/**
 * Build a dynamic filename from naming_convention_fields stored in DB.
 * @param {Array} fields - ordered naming_convention_fields rows
 * @param {Object} meta - user-provided metadata values
 * @param {number} index - file index for auto-generated fields
 * @returns {string} the constructed filename
 */
function buildDynamicName(fields, meta, index) {
  const ext = meta.ext || "jpg";
  const parts = fields
    .filter(f => f.field_name !== 'frame' && f.field_name !== 'sequence') // auto fields
    .map(f => {
      let val = meta[f.field_name] || f.placeholder || "Unknown";
      return String(val).replace(/\s+/g, "");
    });
  return parts.join("_") + `.${ext}`;
}

/* ======== Get student's images ======== */
router.get("/images", auth("student"), (req, res) => {
  const query = `
    SELECT 
      i.*,
      c.name AS category_name,
      t.title AS task_title
    FROM images i
    JOIN categories c ON i.main_category_id = c.id
    LEFT JOIN tasks t ON i.task_id = t.id
    WHERE i.student_id = ?
    ORDER BY i.uploaded_at DESC
  `;
  db.query(query, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to fetch images" });
    res.json(rows);
  });
});

/* ======== Upload images to a task ======== */
router.post("/upload", auth("student"), upload.array("images", 50), (req, res) => {
  const { task_id, naming_meta } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }
  if (!task_id) {
    return res.status(400).json({ message: "task_id is required" });
  }

  let meta;
  try {
    meta = JSON.parse(naming_meta);
  } catch {
    return res.status(400).json({ message: "Invalid naming_meta JSON" });
  }

  // Load task info
  db.query(
    `SELECT t.*, c.name AS category_name, c.naming_prefix
     FROM tasks t JOIN categories c ON t.main_category_id = c.id
     WHERE t.id = ?`,
    [task_id],
    (err, taskRows) => {
      if (err || taskRows.length === 0) {
        return res.status(404).json({ message: "Task not found" });
      }
      const task = taskRows[0];

      // Only check if task is completed (based on approved images reaching target)
      if (task.status === "completed" || task.status === "closed") {
        return res.status(400).json({ message: "Task is no longer accepting uploads" });
      }

      // Block uploads if end_date has passed
      if (task.end_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(task.end_date);
        endDate.setHours(0, 0, 0, 0);
        if (today > endDate) {
          return res.status(400).json({ message: "Upload deadline has passed. This task is no longer accepting images." });
        }
      }

      // Note: Users can upload more than total_images
      // The target is for approved images, not uploaded images

      const isMobility = task.category_name === "Mobility";
      const isAgri     = task.category_name === "Agri";

      db.query(
        "SELECT COUNT(*) AS cnt FROM images WHERE task_id = ?",
        [task_id],
        (err2, countRows) => {
          if (err2) return res.status(500).json({ message: "DB error" });

          let startIndex = (countRows[0].cnt || 0) + 1;
          const inserts = [];
          const renameOps = [];

          req.files.forEach((file, i) => {
            const idx = startIndex + i;
            const ext = path.extname(file.originalname).replace(".", "") || "jpg";
            const metaWithExt = { ...meta, ext };

            let conventionName;
            if (isMobility) {
              conventionName = buildMobilityName(metaWithExt, idx);
            } else if (isAgri) {
              conventionName = buildAgriName(metaWithExt, idx);
            } else if (task.category_name === "Retail") {
              conventionName = buildRetailName(metaWithExt, idx);
            } else {
              // Dynamic: build from naming_convention_fields via meta
              // Fallback: use prefix + joined meta values
              const prefix = (task.naming_prefix || task.category_name.substring(0, 3).toUpperCase());
              const vals = Object.entries(metaWithExt)
                .filter(([k]) => !['ext', 'studentSubSelections', 'generatedName', 'index'].includes(k))
                .map(([, v]) => String(v).replace(/\s+/g, ''));
              conventionName = `${prefix}_${vals.join('_')}_${String(idx).padStart(3, '0')}.${ext}`;
            }

            renameOps.push({ oldPath: file.path, newName: conventionName });

            inserts.push([
              task_id,
              req.user.id,
              conventionName,
              file.originalname,
              conventionName,
              file.size,
              file.mimetype,
              task.main_category_id,
              JSON.stringify({ ...meta, generatedName: conventionName, index: idx })
            ]);
          });

          // Rename files on disk
          renameOps.forEach(({ oldPath, newName }, i) => {
            try {
              let finalPath = path.join(path.dirname(oldPath), newName);
              if (fs.existsSync(finalPath)) {
                const parsed = path.parse(finalPath);
                const unique = parsed.name + "_" + Date.now() + parsed.ext;
                finalPath = path.join(parsed.dir, unique);
                inserts[i][2] = unique;
                inserts[i][4] = unique;
              }
              fs.renameSync(oldPath, finalPath);
            } catch (e) {
              console.error("Rename error:", e.message);
            }
          });

          const insertSql = `
            INSERT INTO images
              (task_id, student_id, filename, original_filename, renamed_filename,
               file_size, mime_type, main_category_id, naming_metadata)
            VALUES ?
          `;

          db.query(insertSql, [inserts], (err3) => {
            if (err3) {
              console.error("IMAGE INSERT ERROR:", err3);
              return res.status(500).json({ message: "Failed to save images" });
            }

            db.query(
              `UPDATE tasks
               SET uploaded_count = uploaded_count + ?,
                   status = IF(approved_count >= total_images, 'completed', 'in_progress')
               WHERE id = ?`,
              [req.files.length, task_id],
              (err4) => {
                if (err4) console.error("TASK COUNT UPDATE ERROR:", err4);

                res.json({
                  message: `${req.files.length} image(s) uploaded and renamed successfully`,
                  count: req.files.length,
                  renamedFiles: inserts.map((r) => r[4])
                });
              }
            );
          });
        }
      );
    }
  );
});

module.exports = router;