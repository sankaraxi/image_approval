const express = require("express");
const router = express.Router();
const db = require("../db");
const { getNamingConventionHelp } = require("../utils/namingConvention");

/* ---------- Get ALL categories (with hierarchy info) ---------- */
router.get("/", (req, res) => {
  db.query(
    "SELECT id, name, level, parent_id, naming_prefix, display_order FROM categories ORDER BY level, display_order",
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

/* ---------- Get main categories (level 1) ---------- */
router.get("/main", (req, res) => {
  db.query(
    "SELECT * FROM categories WHERE level = 1 ORDER BY display_order",
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

/* ---------- Get sub categories by parent ID ---------- */
router.get("/children/:parentId", (req, res) => {
  db.query(
    "SELECT * FROM categories WHERE parent_id = ? ORDER BY display_order",
    [req.params.parentId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

/* ---------- Get category hierarchy (tree structure) ---------- */
router.get("/hierarchy", (req, res) => {
  const query = `
    SELECT 
      c1.id as main_id, c1.name as main_name, c1.naming_prefix,
      c2.id as sub_id, c2.name as sub_name,
      c3.id as subsub_id, c3.name as subsub_name
    FROM categories c1
    LEFT JOIN categories c2 ON c2.parent_id = c1.id AND c2.level = 2
    LEFT JOIN categories c3 ON c3.parent_id = c2.id AND c3.level = 3
    WHERE c1.level = 1
    ORDER BY c1.display_order, c2.display_order, c3.display_order
  `;
  
  db.query(query, (err, results) => {
    if (err) return res.status(500).json(err);
    
    // Transform flat results into hierarchical structure
    const hierarchy = {};
    
    results.forEach(row => {
      if (!hierarchy[row.main_id]) {
        hierarchy[row.main_id] = {
          id: row.main_id,
          name: row.main_name,
          namingPrefix: row.naming_prefix,
          subCategories: {}
        };
      }
      
      if (row.sub_id && !hierarchy[row.main_id].subCategories[row.sub_id]) {
        hierarchy[row.main_id].subCategories[row.sub_id] = {
          id: row.sub_id,
          name: row.sub_name,
          subSubCategories: []
        };
      }
      
      if (row.subsub_id) {
        hierarchy[row.main_id].subCategories[row.sub_id].subSubCategories.push({
          id: row.subsub_id,
          name: row.subsub_name
        });
      }
    });
    
    // Convert to array
    const hierarchyArray = Object.values(hierarchy).map(main => ({
      ...main,
      subCategories: Object.values(main.subCategories)
    }));
    
    res.json(hierarchyArray);
  });
});

/* ---------- Get naming convention for a category ---------- */
router.get("/naming-convention/:categoryName", (req, res) => {
  const convention = getNamingConventionHelp(req.params.categoryName);
  
  if (!convention) {
    return res.status(404).json({ 
      message: "Naming convention not found for this category" 
    });
  }
  
  res.json(convention);
});

/* ---------- Get naming convention FIELDS for a category (dynamic) ---------- */
router.get("/naming-fields/:categoryId", (req, res) => {
  db.query(
    "SELECT * FROM naming_convention_fields WHERE category_id = ? ORDER BY display_order",
    [req.params.categoryId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      // Parse field_options JSON strings
      const parsed = rows.map(r => ({
        ...r,
        field_options: r.field_options
          ? (typeof r.field_options === "string" ? JSON.parse(r.field_options) : r.field_options)
          : null
      }));
      res.json(parsed);
    }
  );
});

/* ---------- Add a naming convention field ---------- */
router.post("/naming-fields", (req, res) => {
  const { category_id, field_name, field_label, field_type, field_options, is_required, display_order, placeholder, separator } = req.body;
  if (!category_id || !field_name || !field_label) {
    return res.status(400).json({ message: "category_id, field_name, and field_label are required" });
  }
  db.query(
    `INSERT INTO naming_convention_fields (category_id, field_name, field_label, field_type, field_options, is_required, display_order, placeholder, separator)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category_id, field_name, field_label,
      field_type || 'text',
      field_options ? JSON.stringify(field_options) : null,
      is_required !== undefined ? is_required : 1,
      display_order || 0,
      placeholder || null,
      separator !== undefined ? separator : '_'
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Naming field added", id: result.insertId });
    }
  );
});

/* ---------- Update a naming convention field ---------- */
router.put("/naming-fields/:id", (req, res) => {
  const { field_name, field_label, field_type, field_options, is_required, display_order, placeholder, separator } = req.body;
  db.query(
    `UPDATE naming_convention_fields
     SET field_name = ?, field_label = ?, field_type = ?, field_options = ?,
         is_required = ?, display_order = ?, placeholder = ?, separator = ?
     WHERE id = ?`,
    [
      field_name, field_label,
      field_type || 'text',
      field_options ? JSON.stringify(field_options) : null,
      is_required !== undefined ? is_required : 1,
      display_order || 0,
      placeholder || null,
      separator !== undefined ? separator : '_',
      req.params.id
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Naming field updated" });
    }
  );
});

/* ---------- Delete a naming convention field ---------- */
router.delete("/naming-fields/:id", (req, res) => {
  db.query("DELETE FROM naming_convention_fields WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Naming field deleted" });
  });
});

/* ---------- Add category ---------- */
router.post("/", (req, res) => {
  const { name, level, parent_id, naming_prefix, display_order } = req.body;

  // Validate level
  if (![1, 2, 3].includes(level)) {
    return res.status(400).json({ message: "Level must be 1, 2, or 3" });
  }

  // Validate parent_id based on level
  if (level > 1 && !parent_id) {
    return res.status(400).json({ message: `Parent ID required for level ${level}` });
  }

  db.query(
    "INSERT INTO categories(name, level, parent_id, naming_prefix, display_order) VALUES (?, ?, ?, ?, ?)",
    [name, level, parent_id || null, naming_prefix || null, display_order || 0],
    (err) => {
      if (err) {
        console.error("Error adding category:", err);
        return res.status(500).json(err);
      }
      res.json({ message: "Category added successfully" });
    }
  );
});

/* ---------- Delete category ---------- */
router.delete("/:id", (req, res) => {
  db.query(
    "DELETE FROM categories WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Category deleted" });
    }
  );
});

module.exports = router;
