const express = require("express");
const db = require("../db");
const verifyAdmin = require("../middleware/verifyAdmin");
const PDFDocument = require("pdfkit");

const router = express.Router();

/* ================= PDF REPORT ================= */
router.get("/report/pdf", verifyAdmin, (req, res) => {
  const statsQuery = `
    SELECT
      (SELECT COUNT(*) FROM tasks) AS total_tasks,
      (SELECT COUNT(*) FROM tasks WHERE status = 'open') AS open_tasks,
      (SELECT COUNT(*) FROM images) AS total_images,
      (SELECT COUNT(*) FROM images WHERE status = 'pending') AS pending_images,
      (SELECT COUNT(*) FROM images WHERE status = 'approved') AS approved_images,
      (SELECT COUNT(*) FROM images WHERE status = 'rejected') AS rejected_images
  `;

  db.query(statsQuery, (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to fetch stats" });

    const stats = results[0];
    const ratePerImage = 4;
    const totalAmount = stats.approved_images * ratePerImage;

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=image_report.pdf");

    doc.pipe(res);

    // Title
    doc.fontSize(24).font("Helvetica-Bold").text("Image Scanner Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#666").text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(2);

    // Summary Section
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#000").text("Summary", { underline: true });
    doc.moveDown(0.5);

    const summaryData = [
      ["Total Tasks", stats.total_tasks],
      ["Open Tasks", stats.open_tasks],
      ["Total Images Uploaded", stats.total_images],
      ["Pending Images", stats.pending_images],
      ["Approved Images", stats.approved_images],
      ["Rejected Images", stats.rejected_images]
    ];

    doc.fontSize(12).font("Helvetica");
    summaryData.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, { continued: false });
    });

    doc.moveDown(2);

    // Financial Section
    doc.fontSize(16).font("Helvetica-Bold").text("Financial Summary", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica");
    doc.text(`Rate per Approved Image: Rs.${ratePerImage}`);
    doc.text(`Total Approved Images: ${stats.approved_images}`);
    doc.moveDown(0.5);
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#16a34a");
    doc.text(`Total Amount: Rs.${totalAmount.toLocaleString("en-IN")}`);

    doc.end();
  });
});

/* ================= IMAGES LIST ================= */
router.get("/images", verifyAdmin, (req, res) => {
  const { task_id } = req.query;

  let sql = `
    SELECT 
      i.id, i.task_id, i.filename, i.original_filename, i.renamed_filename,
      i.file_size, i.status, i.uploaded_at, i.approved_at, i.rejected_at,
      i.naming_metadata, i.admin_notes,
      u.username  AS studentName,
      u.full_name AS studentFullName,
      c.name      AS category_name,
      t.title     AS task_title
    FROM images i
    JOIN users      u ON i.student_id = u.id
    JOIN categories c ON i.main_category_id = c.id
    LEFT JOIN tasks t ON i.task_id = t.id
  `;

  const params = [];
  if (task_id) {
    sql += " WHERE i.task_id = ? ";
    params.push(task_id);
  }
  sql += " ORDER BY i.uploaded_at DESC";

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("ADMIN /images ERROR:", err);
      return res.status(500).json(err);
    }

    const formatted = rows.map((row) => ({
      ...row,
      naming_metadata: row.naming_metadata 
        ? (typeof row.naming_metadata === "string" ? JSON.parse(row.naming_metadata) : row.naming_metadata)
        : null
    }));

    res.json(formatted);
  });
});

/* ================= APPROVE IMAGE ================= */
router.put("/approve/:id", verifyAdmin, (req, res) => {
  const { admin_notes } = req.body;

  db.query(
    `UPDATE images
     SET status = 'approved', approved_at = NOW(), approved_by = ?,
         rejected_at = NULL, rejected_by = NULL, admin_notes = ?
     WHERE id = ?`,
    [req.user.id, admin_notes || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: "Approve failed" });

      // Increment task approved_count and check if task is complete
      db.query(
        `UPDATE tasks t
         JOIN images i ON i.task_id = t.id
         SET t.approved_count = t.approved_count + 1,
             t.status = IF(t.approved_count + 1 >= t.total_images, 'completed', t.status)
         WHERE i.id = ?`,
        [req.params.id]
      );

      res.json({ message: "Image approved" });
    }
  );
});

/* ================= REJECT IMAGE ================= */
router.put("/reject/:id", verifyAdmin, (req, res) => {
  const { admin_notes } = req.body;

  if (!admin_notes || !admin_notes.trim()) {
    return res.status(400).json({ message: "Description is required for rejection" });
  }

  db.query(
    `UPDATE images
     SET status = 'rejected', rejected_at = NOW(), rejected_by = ?,
         approved_at = NULL, approved_by = NULL, admin_notes = ?
     WHERE id = ?`,
    [req.user.id, admin_notes, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: "Reject failed" });

      db.query(
        `UPDATE tasks t
         JOIN images i ON i.task_id = t.id
         SET t.rejected_count = t.rejected_count + 1
         WHERE i.id = ?`,
        [req.params.id]
      );

      res.json({ message: "Image rejected" });
    }
  );
});

/* ================= CATEGORY CRUD ================= */
router.get("/categories", verifyAdmin, (req, res) => {
  db.query(
    "SELECT id, name, level, parent_id, naming_prefix, display_order FROM categories ORDER BY level, display_order",
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

router.post("/category", verifyAdmin, (req, res) => {
  const { name, level, parent_id, naming_prefix, display_order } = req.body;
  if (!name || !level) return res.status(400).json({ message: "name and level required" });

  db.query(
    "INSERT INTO categories (name, level, parent_id, naming_prefix, display_order) VALUES (?, ?, ?, ?, ?)",
    [name, level, parent_id || null, naming_prefix || null, display_order || 0],
    (err) => {
      if (err) return res.status(500).json({ error: "Category add failed" });
      res.json({ message: "Category added" });
    }
  );
});

/* ================= STATS ================= */
router.get("/stats", verifyAdmin, (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM tasks)                                        AS total_tasks,
      (SELECT COUNT(*) FROM tasks WHERE status='open')                    AS open_tasks,
      (SELECT COUNT(*) FROM tasks WHERE status='in_progress')             AS in_progress_tasks,
      (SELECT COUNT(*) FROM tasks WHERE status='completed')               AS completed_tasks,
      (SELECT COUNT(*) FROM images)                                       AS total_images,
      (SELECT COUNT(*) FROM images WHERE status='pending')                AS pending_images,
      (SELECT COUNT(*) FROM images WHERE status='approved')               AS approved_images,
      (SELECT COUNT(*) FROM images WHERE status='rejected')               AS rejected_images
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows[0]);
  });
});

module.exports = router;
