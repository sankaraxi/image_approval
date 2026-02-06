const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "secret_jwt_key_change_in_production";

/* ---------------- LOGIN ---------------- */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT id, username, role, full_name, email FROM users WHERE username=? AND password=?",
    [username, password],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.sendStatus(500);
      }

      if (rows.length === 0) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const user = rows[0];

      const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          full_name: user.full_name,
          email: user.email
        }
      });
    }
  );
});

/* ---------------- REGISTER STUDENT ---------------- */
router.post("/register", (req, res) => {
  const { username, password, full_name, email } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  // check if user already exists
  db.query(
    "SELECT id FROM users WHERE username = ?",
    [username],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.sendStatus(500);
      }

      if (rows.length > 0) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // insert new student
      db.query(
        "INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, 'student', ?, ?)",
        [username, password, full_name || null, email || null],
        (err) => {
          if (err) {
            console.error(err);
            return res.sendStatus(500);
          }

          res.json({ message: "Student registered successfully" });
        }
      );
    }
  );
});

module.exports = router;