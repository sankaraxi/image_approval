const express = require("express");
const db = require("../db");
const verifyBiller = require("../middleware/verifyBiller");
const PDFDocument = require("pdfkit");

const router = express.Router();

/* ================= GET UNBILLED TASKS ================= */
router.get("/tasks/unbilled", verifyBiller, async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        t.*,
        c.name as category_name,
        COUNT(i.id) as uploaded_count,
        SUM(CASE WHEN i.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN i.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
      FROM tasks t
      LEFT JOIN categories c ON t.main_category_id = c.id
      LEFT JOIN images i ON t.id = i.task_id
      WHERE (t.is_billed IS NULL OR t.is_billed = 0)
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /tasks/unbilled error:", err);
    res.status(500).json({ message: "Failed to fetch unbilled tasks" });
  }
});

/* ================= GET BILLING HISTORY ================= */
router.get("/billing-history", verifyBiller, async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT bt.*, u.username as billed_by_name, u.full_name as billed_by_full_name
      FROM billed_tasks bt
      LEFT JOIN users u ON bt.billed_by = u.id
      ORDER BY bt.billed_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /billing-history error:", err);
    res.status(500).json({ message: "Failed to fetch billing history" });
  }
});

/* ================= GENERATE BILL PDF ================= */
router.post("/generate-bill", verifyBiller, async (req, res) => {
  const { taskIds } = req.body;
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ message: "Task IDs required" });
  }

  const placeholders = taskIds.map(() => "?").join(",");
  const ratePerImage = 4;

  try {
    const [taskResults] = await db.promise().query(`
      SELECT 
        t.id, t.title as task_title, t.start_date, t.end_date, t.final_review_date,
        COUNT(i.id) as uploaded,
        SUM(CASE WHEN i.status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN i.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN i.status = 'pending'  THEN 1 ELSE 0 END) as pending
      FROM tasks t
      LEFT JOIN images i ON t.id = i.task_id
      WHERE t.id IN (${placeholders}) AND (t.is_billed IS NULL OR t.is_billed = 0)
      GROUP BY t.id, t.title, t.start_date, t.end_date, t.final_review_date
      ORDER BY t.created_at DESC
    `, taskIds);

    if (!taskResults.length) {
      return res.status(404).json({ message: "No unbilled tasks found for the given IDs" });
    }

    const tasks = taskResults.map(t => ({
      taskId: t.id,
      taskTitle: t.task_title,
      startDate: t.start_date,
      endDate: t.end_date,
      finalReviewDate: t.final_review_date,
      uploaded: parseInt(t.uploaded) || 0,
      approved: parseInt(t.approved) || 0,
      rejected: parseInt(t.rejected) || 0,
      pending: parseInt(t.pending) || 0,
      amount: (parseInt(t.approved) || 0) * ratePerImage
    }));

    const totalApproved = tasks.reduce((s, t) => s + t.approved, 0);
    const totalRejected = tasks.reduce((s, t) => s + t.rejected, 0);
    const totalUploaded = tasks.reduce((s, t) => s + t.uploaded, 0);
    const totalPending  = tasks.reduce((s, t) => s + t.pending, 0);
    const totalAmount   = totalApproved * ratePerImage;

    /* ---- Build PDF ---- */
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=genius_labs_billing_${Date.now()}.pdf`);
    doc.pipe(res);

    // Title
    doc.fontSize(24).font("Helvetica-Bold").text("Genius Labs Image Accumulator Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").fillColor("#666")
       .text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
    doc.fontSize(10).fillColor("#e74c3c").text("BILLING REPORT", { align: "center" });
    doc.moveDown(2);

    // Overall Summary
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#000").text("Overall Summary", { underline: true });
    doc.moveDown(0.8);

    const statsBoxY = doc.y;
    doc.roundedRect(50, statsBoxY, 495, 90, 5).fillAndStroke("#e8f5e9", "#d4edda");
    doc.fontSize(12).font("Helvetica").fillColor("#000");
    let statsY = statsBoxY + 10;
    [
      ["Total Tasks Selected", tasks.length],
      ["Total Images Uploaded", totalUploaded],
      ["Approved Images", totalApproved],
      ["Rejected Images", totalRejected],
      ["Pending Images", totalPending]
    ].forEach(([label, value]) => {
      doc.text(`${label}: `, 60, statsY, { continued: true, width: 200 });
      doc.font("Helvetica-Bold").text(`${value}`);
      doc.font("Helvetica");
      statsY += 16;
    });

    doc.y = statsBoxY + 100;
    doc.moveDown(1.5);

    // Task-wise Breakdown
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#000").text("Task-wise Breakdown", { underline: true });
    doc.moveDown(0.8);

    let currentY = doc.y;

    tasks.forEach((task, idx) => {
      if (currentY > 620) { doc.addPage(); currentY = 50; }

      const cardH = 120;
      const bg = idx % 2 === 0 ? "#f8f9fa" : "#ffffff";
      doc.roundedRect(50, currentY, 495, cardH, 5).fillAndStroke(bg, "#d0d0d0");

      // Title
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#2c3e50");
      doc.text(task.taskTitle, 60, currentY + 10, { width: 475, ellipsis: true });

      // Dates
      let dateY = currentY + 30;
      doc.fontSize(10).font("Helvetica").fillColor("#555");
      if (task.startDate) {
        doc.text("Start: ", 60, dateY, { continued: true });
        doc.font("Helvetica-Bold").fillColor("#2c3e50").text(new Date(task.startDate).toLocaleDateString("en-IN"));
        doc.font("Helvetica").fillColor("#555");
      }
      if (task.endDate) {
        doc.text("End: ", 200, dateY, { continued: true });
        doc.font("Helvetica-Bold").fillColor("#2c3e50").text(new Date(task.endDate).toLocaleDateString("en-IN"));
        doc.font("Helvetica").fillColor("#555");
      }
      if (task.finalReviewDate) {
        doc.text("Review: ", 340, dateY, { continued: true });
        doc.font("Helvetica-Bold").fillColor("#2c3e50").text(new Date(task.finalReviewDate).toLocaleDateString("en-IN"));
      }

      // Stats row
      dateY += 20;
      doc.fontSize(10).font("Helvetica").fillColor("#2c3e50");
      doc.text(`Uploaded: `, 60, dateY, { continued: true });
      doc.font("Helvetica-Bold").text(`${task.uploaded}`, { continued: true });
      doc.font("Helvetica").text(`  |  Approved: `, { continued: true });
      doc.font("Helvetica-Bold").fillColor("#16a34a").text(`${task.approved}`, { continued: true });
      doc.font("Helvetica").fillColor("#2c3e50").text(`  |  Rejected: `, { continued: true });
      doc.font("Helvetica-Bold").fillColor("#dc2626").text(`${task.rejected}`, { continued: true });
      doc.font("Helvetica").fillColor("#2c3e50").text(`  |  Pending: `, { continued: true });
      doc.font("Helvetica-Bold").fillColor("#f59e0b").text(`${task.pending}`);

      // Amount
      dateY += 25;
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#16a34a");
      doc.text(`Amount: Rs.${task.amount.toLocaleString("en-IN")}`, 60, dateY);

      currentY += cardH + 10;
    });

    doc.x = 50;
    doc.y = currentY + 10;
    if (doc.y > 650) { doc.addPage(); doc.y = 50; }

    // Financial Summary
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#000").text("Financial Summary", 50, doc.y, { underline: true });
    doc.moveDown(1);
    const boxY = doc.y;
    doc.roundedRect(50, boxY, 495, 85, 5).fillAndStroke("#e8f5e9", "#c3e6cb");
    doc.fontSize(13).font("Helvetica").fillColor("#2c3e50");
    doc.text("Rate per Approved Image: ", 60, boxY + 15, { continued: true });
    doc.font("Helvetica-Bold").text(`Rs.${ratePerImage}`);
    doc.font("Helvetica").text("Total Approved Images: ", 60, boxY + 35, { continued: true });
    doc.font("Helvetica-Bold").text(`${totalApproved}`);
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#16a34a");
    doc.text(`Total Amount: Rs.${totalAmount.toLocaleString("en-IN")}`, 60, boxY + 55);

    doc.end();

    /* ---- Mark billed after PDF streams ---- */
    doc.on("end", async () => {
      try {
        const billedBy = req.user.id;
        const billedAt = new Date();

        await db.promise().query(
          `UPDATE tasks SET is_billed = 1, billed_at = ?, billed_by = ? WHERE id IN (${placeholders})`,
          [billedAt, billedBy, ...taskIds]
        );

        const inserts = tasks.map(t =>
          db.promise().query(
            `INSERT INTO billed_tasks
             (task_id, task_title, total_images, approved_images, rejected_images,
              amount_per_image, total_amount, start_date, end_date, billed_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [t.taskId, t.taskTitle, t.uploaded, t.approved, t.rejected,
             ratePerImage, t.amount, t.startDate, t.endDate, billedBy]
          )
        );
        await Promise.all(inserts);

        console.log(`Billed tasks [${taskIds}] by user ${billedBy}`);
      } catch (err) {
        console.error("Error marking tasks billed:", err);
      }
    });
  } catch (err) {
    console.error("/generate-bill error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
