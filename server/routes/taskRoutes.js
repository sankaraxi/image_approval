const express = require("express");
const db = require("../db");
const verifyAdmin = require("../middleware/verifyAdmin");
const auth = require("../middleware/authMiddleware");
const { sendTaskCreationEmail } = require("../utils/emailService");

const router = express.Router();

/* =========================================================
   ADMIN – Create a new task / job card
   ========================================================= */
router.post("/", verifyAdmin, (req, res) => {
  const {
    title,
    description,
    main_category_id,
    total_images,
    start_date,
    end_date,
    final_review_date,
    subcategory_requirements // [{ subcategory_id, subsub_category_id | null }, ...]
  } = req.body;

  if (!title || !main_category_id || !total_images) {
    return res.status(400).json({ message: "title, main_category_id, and total_images are required" });
  }

  const hasSubSpecs =
    Array.isArray(subcategory_requirements) &&
    subcategory_requirements.length > 0 &&
    subcategory_requirements.every((r) => r.subsub_category_id);

  db.query(
    `INSERT INTO tasks (title, description, main_category_id, total_images, subcategories_specified, created_by, start_date, end_date, final_review_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description || null, main_category_id, total_images, hasSubSpecs, req.user.id, start_date || null, end_date || null, final_review_date || null],
    (err, result) => {
      if (err) {
        console.error("CREATE TASK ERROR:", err);
        return res.status(500).json({ message: "Failed to create task" });
      }

      const taskId = result.insertId;

      // Get category name and user details for email
      db.query(
        `SELECT c.name AS category_name, u.username 
         FROM categories c, users u 
         WHERE c.id = ? AND u.id = ?`,
        [main_category_id, req.user.id],
        (err3, details) => {
          const taskDetails = {
            taskId,
            title,
            description,
            totalImages: total_images,
            categoryName: details && details[0] ? details[0].category_name : 'N/A',
            createdBy: details && details[0] ? details[0].username : req.user.username || 'Admin'
          };

          // Send email notification (async, don't wait for it)
          sendTaskCreationEmail(taskDetails).catch(emailErr => {
            console.error('Failed to send task creation email:', emailErr);
          });
        }
      );

      // Insert subcategory requirements if provided
      if (Array.isArray(subcategory_requirements) && subcategory_requirements.length > 0) {
        const rows = subcategory_requirements.map((r) => [
          taskId,
          r.subcategory_id,
          r.subsub_category_id || null
        ]);

        db.query(
          `INSERT INTO task_subcategory_requirements (task_id, subcategory_id, subsub_category_id) VALUES ?`,
          [rows],
          (err2) => {
            if (err2) {
              console.error("TASK REQS INSERT ERROR:", err2);
              return res.status(500).json({ message: "Task created but failed to save subcategory requirements" });
            }
            return res.json({ message: "Task created successfully", taskId });
          }
        );
      } else {
        return res.json({ message: "Task created successfully", taskId });
      }
    }
  );
});

/* =========================================================
   ADMIN – Update a task
   ========================================================= */
router.put("/:id", verifyAdmin, (req, res) => {
  const taskId = req.params.id;
  const {
    title,
    description,
    main_category_id,
    total_images,
    start_date,
    end_date,
    final_review_date,
    subcategory_requirements // [{ subcategory_id, subsub_category_id | null }, ...]
  } = req.body;

  if (!title || !main_category_id || !total_images) {
    return res.status(400).json({ message: "title, main_category_id, and total_images are required" });
  }

  const hasSubSpecs =
    Array.isArray(subcategory_requirements) &&
    subcategory_requirements.length > 0 &&
    subcategory_requirements.every((r) => r.subsub_category_id);

  db.query(
    `UPDATE tasks 
     SET title = ?, description = ?, main_category_id = ?, total_images = ?, subcategories_specified = ?,
         start_date = ?, end_date = ?, final_review_date = ?
     WHERE id = ?`,
    [title, description || null, main_category_id, total_images, hasSubSpecs, start_date || null, end_date || null, final_review_date || null, taskId],
    (err, result) => {
      if (err) {
        console.error("UPDATE TASK ERROR:", err);
        return res.status(500).json({ message: "Failed to update task" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Delete existing subcategory requirements
      db.query(
        `DELETE FROM task_subcategory_requirements WHERE task_id = ?`,
        [taskId],
        (err2) => {
          if (err2) {
            console.error("DELETE REQS ERROR:", err2);
            return res.status(500).json({ message: "Task updated but failed to update subcategory requirements" });
          }

          // Insert new subcategory requirements if provided
          if (Array.isArray(subcategory_requirements) && subcategory_requirements.length > 0) {
            const rows = subcategory_requirements.map((r) => [
              taskId,
              r.subcategory_id,
              r.subsub_category_id || null
            ]);

            db.query(
              `INSERT INTO task_subcategory_requirements (task_id, subcategory_id, subsub_category_id) VALUES ?`,
              [rows],
              (err3) => {
                if (err3) {
                  console.error("TASK REQS INSERT ERROR:", err3);
                  return res.status(500).json({ message: "Task updated but failed to save subcategory requirements" });
                }
                return res.json({ message: "Task updated successfully", taskId });
              }
            );
          } else {
            return res.json({ message: "Task updated successfully", taskId });
          }
        }
      );
    }
  );
});

/* =========================================================
   LIST tasks  –  admin sees all, student sees open tasks
   ========================================================= */
router.get("/", auth(), (req, res) => {
  const isAdmin = req.user.role === "admin";

  const sql = `
    SELECT
      t.*,
      c.name AS category_name,
      c.naming_prefix,
      u.username AS created_by_name
    FROM tasks t
    JOIN categories c ON t.main_category_id = c.id
    JOIN users u ON t.created_by = u.id
    ${isAdmin ? "" : "WHERE t.status IN ('open','in_progress')"}
    ORDER BY t.created_at DESC
  `;

  db.query(sql, (err, tasks) => {
    if (err) {
      console.error("LIST TASKS ERROR:", err);
      return res.status(500).json({ message: "Failed to fetch tasks" });
    }
    res.json(tasks);
  });
});

/* =========================================================
   GET single task with its subcategory requirements
   ========================================================= */
router.get("/:id", auth(), (req, res) => {
  const taskSql = `
    SELECT t.*, c.name AS category_name, c.naming_prefix
    FROM tasks t
    JOIN categories c ON t.main_category_id = c.id
    WHERE t.id = ?
  `;

  db.query(taskSql, [req.params.id], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const task = rows[0];

    const reqsSql = `
      SELECT
        tsr.id,
        tsr.subcategory_id,
        tsr.subsub_category_id,
        c2.name AS subcategory_name,
        c3.name AS subsub_category_name
      FROM task_subcategory_requirements tsr
      JOIN categories c2 ON tsr.subcategory_id = c2.id
      LEFT JOIN categories c3 ON tsr.subsub_category_id = c3.id
      WHERE tsr.task_id = ?
    `;

    db.query(reqsSql, [task.id], (err2, reqs) => {
      if (err2) {
        return res.status(500).json({ message: "Failed to load requirements" });
      }
      task.requirements = reqs;
      res.json(task);
    });
  });
});

/* =========================================================
   ADMIN – Update task status
   ========================================================= */
router.put("/:id/status", verifyAdmin, (req, res) => {
  const { status } = req.body;
  if (!["open", "in_progress", "completed", "closed"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  db.query("UPDATE tasks SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "Failed to update task" });
    res.json({ message: "Task status updated" });
  });
});

/* =========================================================
   ADMIN – Delete a task
   ========================================================= */
router.delete("/:id", verifyAdmin, (req, res) => {
  db.query("DELETE FROM tasks WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "Failed to delete task" });
    res.json({ message: "Task deleted" });
  });
});

module.exports = router;
