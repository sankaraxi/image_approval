const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes     = require("./routes/authRoutes");
const studentRoutes  = require("./routes/studentRoutes");
const adminRoutes    = require("./routes/adminRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const taskRoutes     = require("./routes/taskRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth",       authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/student",    studentRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/tasks",      taskRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});