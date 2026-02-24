require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cron = require("node-cron");
const db = require("./db");
const { sendDailyReportEmail } = require("./utils/emailService");

const authRoutes     = require("./routes/authRoutes");
const studentRoutes  = require("./routes/studentRoutes");
const adminRoutes    = require("./routes/adminRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const taskRoutes     = require("./routes/taskRoutes");

const app = express();

app.use(cors({
  origin: ['http://103.118.158.33:5173', 'http://localhost:5173'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth",       authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/student",    studentRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/tasks",      taskRoutes);

app.listen(5003, () => {
  console.log("Server running on port 5003");
});

// Auto-complete tasks whose end_date has passed (runs every day at midnight)
cron.schedule('0 0 * * *', () => {
  console.log('Checking for tasks past their end_date...');
  db.query(
    `UPDATE tasks SET status = 'completed' WHERE end_date IS NOT NULL AND end_date < CURDATE() AND status IN ('open', 'in_progress')`,
    (err, result) => {
      if (err) {
        console.error('Error auto-completing tasks:', err);
      } else if (result.affectedRows > 0) {
        console.log(`Auto-completed ${result.affectedRows} task(s) past their end date.`);
      }
    }
  );
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

console.log('Task end-date auto-complete cron job scheduled for midnight IST');


// Schedule daily report email at 7:00 PM every day
cron.schedule('00 19 * * *', async () => {
  console.log('Running daily report job at 7:00 PM...');
  
  try {
    // Get overall statistics
    const overallQuery = `
      SELECT 
        COUNT(*) as total_uploaded,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as total_approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as total_rejected,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as total_pending
      FROM images
    `;

    db.query(overallQuery, (err, overallResults) => {
      if (err) {
        console.error('Error fetching overall statistics:', err);
        return;
      }

      const overall = overallResults[0];
      const totalUploaded = parseInt(overall.total_uploaded) || 0;
      const totalApproved = parseInt(overall.total_approved) || 0;
      const totalRejected = parseInt(overall.total_rejected) || 0;
      const totalPending = parseInt(overall.total_pending) || 0;

      // Calculate percentages
      const approvalRate = totalUploaded > 0 ? ((totalApproved / totalUploaded) * 100).toFixed(2) : 0;
      const rejectionRate = totalUploaded > 0 ? ((totalRejected / totalUploaded) * 100).toFixed(2) : 0;
      const pendingRate = totalUploaded > 0 ? ((totalPending / totalUploaded) * 100).toFixed(2) : 0;

      // Get task-wise breakdown
      const taskQuery = `
        SELECT 
          t.id,
          t.title as task_title,
          COUNT(i.id) as uploaded,
          SUM(CASE WHEN i.status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN i.status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM tasks t
        LEFT JOIN images i ON t.id = i.task_id
        GROUP BY t.id, t.title
        HAVING COUNT(i.id) > 0
        ORDER BY t.created_at DESC
      `;

      db.query(taskQuery, async (err2, taskResults) => {
        if (err2) {
          console.error('Error fetching task breakdown:', err2);
          return;
        }

        const taskBreakdown = taskResults.map(task => ({
          taskTitle: task.task_title,
          uploaded: parseInt(task.uploaded) || 0,
          approved: parseInt(task.approved) || 0,
          rejected: parseInt(task.rejected) || 0
        }));

        const stats = {
          totalUploaded,
          totalApproved,
          totalRejected,
          totalPending,
          approvalRate,
          rejectionRate,
          pendingRate,
          taskBreakdown
        };

        // Send the email
        const result = await sendDailyReportEmail(stats);
        if (result.success) {
          console.log('Daily report email sent successfully!');
        } else {
          console.error('Failed to send daily report email:', result.error);
        }
      });
    });
  } catch (error) {
    console.error('Error in daily report cron job:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata" // India timezone for 7 PM IST
});

console.log('Daily report cron job scheduled for 7:00 PM IST');