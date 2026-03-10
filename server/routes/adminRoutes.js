const express = require("express");
const db = require("../db");
const verifyAdmin = require("../middleware/verifyAdmin");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const vendorUploadService = require("../services/vendorUploadService");


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

    // Get task-wise breakdown
    const taskQuery = `
      SELECT 
        t.id,
        t.title as task_title,
        COUNT(i.id) as uploaded,
        SUM(CASE WHEN i.status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN i.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM tasks t
      LEFT JOIN images i ON t.id = i.task_id
      GROUP BY t.id, t.title
      HAVING COUNT(i.id) > 0
      ORDER BY t.created_at DESC
    `;

    db.query(taskQuery, (err2, taskResults) => {
      if (err2) {
        console.error('Error fetching task breakdown:', err2);
        return res.status(500).json({ message: "Failed to fetch task breakdown" });
      }

      const taskBreakdown = taskResults.map(task => ({
        taskTitle: task.task_title,
        uploaded: parseInt(task.uploaded) || 0,
        approved: parseInt(task.approved) || 0,
        rejected: parseInt(task.rejected) || 0,
        pending: parseInt(task.pending) || 0,
        amount: (parseInt(task.approved) || 0) * ratePerImage
      }));

      const totalAmount = stats.approved_images * ratePerImage;

      const doc = new PDFDocument({ margin: 50 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=genius_labs_image_accumulator_report.pdf");

      doc.pipe(res);

      // Title
      doc.fontSize(24).font("Helvetica-Bold").text("Genius Labs Image Accumulator Report", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").fillColor("#666").text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
      doc.moveDown(2);

      // Overall Summary Section with background
      doc.fontSize(16).font("Helvetica-Bold").fillColor("#000").text("Overall Statistics", { underline: true });
      doc.moveDown(0.8);

      // Background box for overall stats
      const statsBoxY = doc.y;
      doc.roundedRect(50, statsBoxY, 495, 110, 5).fillAndStroke("#e8f5e9", "#d4edda");
      
      doc.fontSize(12).font("Helvetica").fillColor("#000");
      let statsY = statsBoxY + 10;
      const summaryData = [
        ["Total Tasks", stats.total_tasks],
        ["Open Tasks", stats.open_tasks],
        ["Total Images Uploaded", stats.total_images],
        ["Pending Images", stats.pending_images],
        ["Approved Images", stats.approved_images],
        ["Rejected Images", stats.rejected_images]
      ];

      summaryData.forEach(([label, value]) => {
        doc.text(`${label}: `, 60, statsY, { continued: true, width: 200 });
        doc.font("Helvetica-Bold").text(`${value}`, { continued: false });
        doc.font("Helvetica");
        statsY += 18;
      });

      doc.y = statsBoxY + 120;
      doc.moveDown(1.5);

      // Task-wise Breakdown Section
      if (taskBreakdown && taskBreakdown.length > 0) {
        doc.fontSize(16).font("Helvetica-Bold").fillColor("#000").text("Task-wise Breakdown", { underline: true });
        doc.moveDown(0.8);

        const tableTop = doc.y;
        const rowHeight = 30;
        const headerHeight = 25;
        
        // Column definitions with better spacing
        const columns = [
          { header: "Task", x: 50, width: 210 },
          { header: "Uploaded", x: 260, width: 70 },
          { header: "Approved", x: 330, width: 70 },
          { header: "Rejected", x: 400, width: 70 },
          { header: "Amount (Rs.)", x: 470, width: 75 }
        ];

        // Table Header with dark background
        doc.roundedRect(50, tableTop, 495, headerHeight, 3).fillAndStroke("#34495e", "#2c3e50");
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#ffffff");
        
        columns.forEach(col => {
          if (col.header === "Task") {
            doc.text(col.header, col.x + 8, tableTop + 8, { width: col.width - 16 });
          } else {
            doc.text(col.header, col.x, tableTop + 8, { width: col.width, align: "center" });
          }
        });

        let currentY = tableTop + headerHeight;

        // Table Rows
        doc.fontSize(10).font("Helvetica");
        taskBreakdown.forEach((task, index) => {
          // Check if we need a new page
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          const bgColor = index % 2 === 0 ? "#ffffff" : "#f8f9fa";
          doc.rect(50, currentY, 495, rowHeight).fillAndStroke(bgColor, "#d0d0d0");
          
          const textY = currentY + 10;
          
          // Task name (left aligned)
          doc.fillColor("#000");
          doc.text(task.taskTitle, columns[0].x + 8, textY, { width: columns[0].width - 16, ellipsis: true });
          
          // Uploaded (center aligned)
          doc.fillColor("#2c3e50");
          const uploadedText = String(task.uploaded);
          doc.text(uploadedText, columns[1].x + (columns[1].width - doc.widthOfString(uploadedText)) / 2, textY);
          
          // Approved (center aligned, green)
          doc.fillColor("#16a34a").font("Helvetica-Bold");
          const approvedText = String(task.approved);
          doc.text(approvedText, columns[2].x + (columns[2].width - doc.widthOfString(approvedText)) / 2, textY);
          
          // Rejected (center aligned, red)
          doc.fillColor("#dc2626");
          const rejectedText = String(task.rejected);
          doc.text(rejectedText, columns[3].x + (columns[3].width - doc.widthOfString(rejectedText)) / 2, textY);
          
          // Amount (right aligned, bold)
          doc.fillColor("#16a34a").font("Helvetica-Bold");
          const amountText = task.amount.toLocaleString("en-IN");
          doc.text(amountText, columns[4].x + columns[4].width - doc.widthOfString(amountText) - 8, textY);

          doc.font("Helvetica");
          currentY += rowHeight;
        });

        // Set cursor position after table
        doc.x = 50;
        doc.y = currentY + 20;
      }

      // Financial Summary Section with background box
      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
        doc.y = 50;
      }

      doc.fontSize(16).font("Helvetica-Bold").fillColor("#000");
      doc.text("Financial Summary", 50, doc.y, { underline: true });
      doc.moveDown(1);

      const boxY = doc.y;
      doc.roundedRect(50, boxY, 495, 85, 5).fillAndStroke("#e8f5e9", "#c3e6cb");
      
      doc.fontSize(13).font("Helvetica").fillColor("#2c3e50");
      doc.text("Rate per Approved Image: ", 60, boxY + 15, { continued: true });
      doc.font("Helvetica-Bold").text(`Rs.${ratePerImage}`);
      
      doc.font("Helvetica");
      doc.text("Total Approved Images: ", 60, boxY + 35, { continued: true });
      doc.font("Helvetica-Bold").text(`${stats.approved_images}`);
      
      doc.fontSize(18).font("Helvetica-Bold").fillColor("#16a34a");
      doc.text(`Total Amount: Rs.${totalAmount.toLocaleString("en-IN")}`, 60, boxY + 55);

      doc.end();
    });
  });
});

/* ================= APPROVE IMAGE AND UPLOAD TO VENDOR ================= */
router.post("/approve-image/:imageId", verifyAdmin, async (req, res) => {
  const imageId = req.params.imageId;
  try {
    const [rows] = await db.promise().query("SELECT * FROM images WHERE id = ?", [imageId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Image not found" });

    const image = rows[0];
    const uploadsDir = path.join(__dirname, "..", "uploads");
    const filePath = path.join(uploadsDir, image.filename);

    if (!fs.existsSync(filePath)) {
      console.error("Approved image file missing:", filePath);
      return res.status(500).json({ message: "Image file not found on server" });
    }

    // Request signed URL and upload the file
    try {
      await vendorUploadService.uploadApprovedImageToVendor(filePath, image.renamed_filename || image.filename, image.mime_type || "application/octet-stream");
    } catch (err) {
      console.error("Vendor upload failed for imageId", imageId, err);
      return res.status(502).json({ message: "Failed to upload to vendor", error: err.message || err });
    }

    // Update image status to approved and mark uploaded_to_vendor = true when possible
    try {
      await db.promise().query(
        `UPDATE images
         SET status = 'approved', approved_at = NOW(), approved_by = ?, uploaded_to_vendor = 1, admin_notes = ?
         WHERE id = ?`,
        [req.user.id, req.body.admin_notes || null, imageId]
      );
    } catch (updateErr) {
      // If DB doesn't have uploaded_to_vendor column, fallback to update without it
      if (updateErr && updateErr.code === "ER_BAD_FIELD_ERROR") {
        console.warn("images.uploaded_to_vendor column missing — skipping that field");
        await db.promise().query(
          `UPDATE images
           SET status = 'approved', approved_at = NOW(), approved_by = ?, admin_notes = ?
           WHERE id = ?`,
          [req.user.id, req.body.admin_notes || null, imageId]
        );
      } else {
        console.error("Failed to update image status for imageId", imageId, updateErr);
        return res.status(500).json({ message: "Failed to update image status" });
      }
    }

    // Update task status if all images are approved (best-effort)
    try {
      await db.promise().query(
        `UPDATE tasks t
         SET t.status = IF(
           (SELECT COUNT(*) FROM images WHERE task_id = t.id AND status = 'approved') >= t.total_images,
           'completed',
           IF(t.status = 'open', 'in_progress', t.status)
         )
         WHERE t.id = (SELECT task_id FROM images WHERE id = ?)`,
        [imageId]
      );
    } catch (taskErr) {
      console.warn("Failed to update task status for imageId", imageId, taskErr);
    }

    res.json({ message: "Image approved and uploaded to vendor" });
  } catch (err) {
    console.error("/approve-image error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
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

      // Update task status based on dynamically calculated approved count
      db.query(
        `UPDATE tasks t
         SET t.status = IF(
           (SELECT COUNT(*) FROM images WHERE task_id = t.id AND status = 'approved') >= t.total_images,
           'completed',
           IF(t.status = 'open', 'in_progress', t.status)
         )
         WHERE t.id = (SELECT task_id FROM images WHERE id = ?)`,
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

      // No need to update task counts - they're calculated dynamically
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
