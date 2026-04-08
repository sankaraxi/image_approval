const express = require("express");
const db = require("../db");
const verifyBiller = require("../middleware/verifyBiller");
const { sendBillingEmail } = require("../utils/emailService");

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
      SELECT bt.*, i.id as invoice_id, i.invoice_number, i.status as invoice_status, i.transaction_id, i.payment_date, i.payment_amount
      FROM billed_tasks bt
      LEFT JOIN invoices i ON bt.invoice_id = i.id
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
  const { taskIds, agriRates } = req.body;
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ message: "Task IDs required" });
  }

  const subcategoryMap = {
    "healthyPlant": 74,
    "diseasedPlant": 75,
    "pestAffected": 76,
    "HL": 74,
    "DS": 75,
    "DRY": 76,
  };
  const rates = {
    74: 4, // Healthy Plant
    75: agriRates?.diseasedPlant || 4, // Diseased Plant - biller entered
    76: agriRates?.pestAffected || 4, // Pest-Affected Plant - biller entered
  };
  const categoryNames = {
    74: 'Healthy Plant',
    75: 'Diseased Plant',
    76: 'Pest-Affected Plant',
  };
  const defaultRate = 4;

  const placeholders = taskIds.map(() => "?").join(",");

  try {
    const [taskResults] = await db.promise().query(`
      SELECT 
        t.id, t.title as task_title, t.start_date, t.end_date, t.final_review_date, t.main_category_id,
        c.name as category_name,
        COUNT(i.id) as uploaded,
        SUM(CASE WHEN i.status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN i.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN i.status = 'pending'  THEN 1 ELSE 0 END) as pending
      FROM tasks t
      LEFT JOIN categories c ON t.main_category_id = c.id
      LEFT JOIN images i ON t.id = i.task_id
      WHERE t.id IN (${placeholders}) AND (t.is_billed IS NULL OR t.is_billed = 0)
      GROUP BY t.id, t.title, t.start_date, t.end_date, t.final_review_date, t.main_category_id, c.name
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
      main_category_id: t.main_category_id,
      category_name: t.category_name,
      uploaded: parseInt(t.uploaded) || 0,
      approved: parseInt(t.approved) || 0,
      rejected: parseInt(t.rejected) || 0,
      pending: parseInt(t.pending) || 0,
      // amount will be set later
    }));

    // Get subcategory counts for agri tasks
    const agriTaskIds = tasks.filter(t => t.main_category_id === 68).map(t => t.taskId);
    let subCountsByTask = {};
    if (agriTaskIds.length > 0) {
      const subPlaceholders = agriTaskIds.map(() => "?").join(",");
      const [subRows] = await db.promise().query(`
        SELECT task_id,
               COALESCE(
                 JSON_UNQUOTE(JSON_EXTRACT(naming_metadata, '$.condition')),
                 JSON_UNQUOTE(JSON_EXTRACT(naming_metadata, '$.observedCondition'))
               ) as obs_condition,
               COUNT(*) as count
        FROM images
        WHERE task_id IN (${subPlaceholders}) AND status = 'approved'
        GROUP BY task_id,
                 COALESCE(
                   JSON_UNQUOTE(JSON_EXTRACT(naming_metadata, '$.condition')),
                   JSON_UNQUOTE(JSON_EXTRACT(naming_metadata, '$.observedCondition'))
                 )
      `, agriTaskIds);
      for (const row of subRows) {
        if (!subCountsByTask[row.task_id]) subCountsByTask[row.task_id] = {};
        const subId = subcategoryMap[row.obs_condition];
        if (subId) {
          subCountsByTask[row.task_id][subId] = row.count;
        }
      }
    }

    // Calculate amounts
    for (const task of tasks) {
      if (task.main_category_id === 68) {
        let amount = 0;
        const subBreakdown = {};
        const subs = subCountsByTask[task.taskId] || {};
        for (const [subIdStr, count] of Object.entries(subs)) {
          const subId = parseInt(subIdStr);
          const rate = rates[subId] || defaultRate;
          const subAmount = count * rate;
          amount += subAmount;
          subBreakdown[subId] = { count, rate, amount: subAmount };
        }
        task.amount = amount;
        task.subBreakdown = subBreakdown;
      } else {
        task.amount = task.approved * defaultRate;
        task.subBreakdown = null;
      }
    }

    const totalApproved = tasks.reduce((s, t) => s + t.approved, 0);
    const totalRejected = tasks.reduce((s, t) => s + t.rejected, 0);
    const totalUploaded = tasks.reduce((s, t) => s + t.uploaded, 0);
    const totalPending  = tasks.reduce((s, t) => s + t.pending, 0);
    const totalAmount = tasks.reduce((s, t) => s + t.amount, 0);

    // Send billing email
    const emailResult = await sendBillingEmail({ tasks, totalApproved, totalRejected, totalUploaded, totalPending, totalAmount, rates, categoryNames });
    if (!emailResult.success) {
      return res.status(500).json({ message: "Failed to send billing email" });
    }

    // Create invoice
    const invoiceNumber = `INV-${Date.now()}`;
    const [invoiceResult] = await db.promise().query(
      `INSERT INTO invoices (invoice_number, total_amount) VALUES (?, ?)`,
      [invoiceNumber, totalAmount]
    );
    const invoiceId = invoiceResult.insertId;

    // Mark as billed
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
            amount_per_image, total_amount, start_date, end_date, billed_by, invoice_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.taskId, t.taskTitle, t.uploaded, t.approved, t.rejected,
           t.approved > 0 ? t.amount / t.approved : 0, t.amount, t.startDate, t.endDate, billedBy, invoiceId]
        )
      );
      await Promise.all(inserts);

      console.log(`Billed tasks [${taskIds}] under invoice ${invoiceNumber}`);
    } catch (err) {
      console.error("Error marking tasks billed:", err);
      return res.status(500).json({ message: "Billing email sent but failed to mark tasks as billed" });
    }

    res.json({ message: "Billing report sent via email successfully" });
  } catch (err) {
    console.error("/generate-bill error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}); 
/* ================= MARK PAYMENT RECEIVED ================= */
router.post("/mark-payment", verifyBiller, async (req, res) => {
  const { invoiceId, transactionId, paymentDate, paymentAmount } = req.body;
  if (!invoiceId || !transactionId || !paymentDate || !paymentAmount) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
    await db.promise().query(
      `UPDATE invoices SET status = 'completed', transaction_id = ?, payment_date = ?, payment_amount = ? WHERE id = ?`,
      [transactionId, paymentDate, paymentAmount, invoiceId]
    );
    res.json({ message: "Payment marked as received" });
  } catch (err) {
    console.error("POST /mark-payment error:", err);
    res.status(500).json({ message: "Failed to mark payment" });
  }
});
/* ================= MARK PAYMENT RECEIVED ================= */
router.post("/mark-payment", verifyBiller, async (req, res) => {
  const { invoiceId, transactionId, paymentDate, paymentAmount } = req.body;
  if (!invoiceId || !transactionId || !paymentDate || !paymentAmount) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
    await db.promise().query(
      `UPDATE invoices SET status = 'completed', transaction_id = ?, payment_date = ?, payment_amount = ? WHERE id = ?`,
      [transactionId, paymentDate, paymentAmount, invoiceId]
    );
    res.json({ message: "Payment marked as received" });
  } catch (err) {
    console.error("POST /mark-payment error:", err);
    res.status(500).json({ message: "Failed to mark payment" });
  }
});

module.exports = router;
