const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "akshYan2128",
  database: "image_approval",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Optional: test one connection at startup
db.getConnection((err, connection) => {
  if (err) {
    console.error("MySQL Pool connection error:", err);
  } else {
    console.log("MySQL Pool connected successfully");
    connection.release(); // VERY IMPORTANT
  }
});

module.exports = db;