# 🚀 Migration Guide - Database Schema Update

This guide will help you migrate from the old database schema to the new enhanced version.

## ⚠️ Important: Backup First!

Before proceeding, backup your existing database:

```bash
mysqldump -u root -p image_approval > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 📊 What's Changed

### Database Schema Changes

#### 1. **Users Table**
- ✅ Added: `email` VARCHAR(100)
- ✅ Added: `full_name` VARCHAR(100)
- ✅ Added: `created_at` TIMESTAMP

#### 2. **Categories Table** (Complete Redesign)
- ✅ Added: `level` TINYINT (1, 2, or 3)
- ✅ Enhanced: `parent_id` with proper foreign keys
- ✅ Added: `naming_prefix` VARCHAR(20)
- ✅ Added: `description` TEXT
- ✅ Added: `is_active` BOOLEAN
- ✅ Added: `display_order` INT
- ✅ Pre-populated with Mobility and Retail hierarchies

#### 3. **Images Table** (Major Enhancement)
- ✅ Added: `original_filename` VARCHAR(255)
- ✅ Added: `file_size` BIGINT
- ✅ Added: `mime_type` VARCHAR(50)
- ✅ Changed: `category` → `main_category_id`, `sub_category_id`, `subsub_category_id`
- ✅ Added: `naming_compliant` BOOLEAN
- ✅ Added: `naming_metadata` JSON
- ✅ Enhanced: `status` ENUM with proper values
- ✅ Added: `approved_by`, `rejected_by` foreign keys
- ✅ Added: `admin_notes` TEXT

#### 4. **New Tables**
- ✅ `naming_conventions` - Stores naming rules per category
- ✅ `v_images_with_categories` - View for easy querying

## 🔄 Migration Options

### Option 1: Fresh Installation (Recommended for New Projects)

1. Drop existing database (if testing):
```sql
DROP DATABASE IF EXISTS image_approval;
CREATE DATABASE image_approval;
```

2. Import new schema:
```bash
mysql -u root -p image_approval < server/image_approval_v2.sql
```

3. Done! The schema includes sample data.

### Option 2: Preserve Existing Data (Production Migration)

This is more complex. Follow these steps carefully:

#### Step 1: Export Existing Data

```sql
-- Export users
SELECT * FROM users INTO OUTFILE '/tmp/users_backup.csv'
FIELDS TERMINATED BY ',' ENCLOSED BY '"'
LINES TERMINATED BY '\n';

-- Export old images
SELECT * FROM images INTO OUTFILE '/tmp/images_backup.csv'
FIELDS TERMINATED BY ',' ENCLOSED BY '"'
LINES TERMINATED BY '\n';

-- Export old categories
SELECT * FROM categories INTO OUTFILE '/tmp/categories_backup.csv'
FIELDS TERMINATED BY ',' ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

#### Step 2: Run New Schema

```bash
mysql -u root -p image_approval < server/image_approval_v2.sql
```

#### Step 3: Migrate Users

```sql
-- The new schema has email and full_name fields
-- If you don't have this data, use NULL values

INSERT INTO users (id, username, password, role, email, full_name, created_at)
SELECT 
  id, 
  username, 
  password, 
  role,
  NULL as email,
  NULL as full_name,
  NOW() as created_at
FROM old_users_backup;
```

#### Step 4: Map Old Categories to New Hierarchy

This requires manual mapping since the structure changed significantly:

```sql
-- Example: Map old "Mobility" to new main category
-- Find the new category ID first:
SELECT id FROM categories WHERE name = 'Mobility' AND level = 1;

-- Then you can map your old images
-- But this is application-specific based on your old data
```

#### Step 5: Migrate Images

```sql
-- This is complex due to category structure changes
-- You'll need to determine main_category_id, sub_category_id, subsub_category_id
-- based on your old single category field

-- Example migration (adjust based on your data):
INSERT INTO images (
  student_id,
  filename,
  original_filename,
  main_category_id,
  sub_category_id,
  subsub_category_id,
  status,
  uploaded_at,
  naming_compliant
)
SELECT 
  student_id,
  filename,
  filename as original_filename,
  (SELECT id FROM categories WHERE name = old.category AND level = 1) as main_category_id,
  NULL as sub_category_id,
  NULL as subsub_category_id,
  COALESCE(status, 'pending'),
  uploaded_at,
  FALSE as naming_compliant
FROM old_images_backup old;
```

## 🧪 Testing the Migration

After migration, verify everything works:

### 1. Check Data Integrity

```sql
-- Count records
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Categories', COUNT(*) FROM categories
UNION ALL
SELECT 'Images', COUNT(*) FROM images;

-- Verify category hierarchy
SELECT 
  c1.name as Main,
  c2.name as Sub,
  c3.name as SubSub
FROM categories c1
LEFT JOIN categories c2 ON c2.parent_id = c1.id AND c2.level = 2
LEFT JOIN categories c3 ON c3.parent_id = c2.id AND c3.level = 3
WHERE c1.level = 1
LIMIT 10;

-- Check images with categories
SELECT * FROM v_images_with_categories LIMIT 10;
```

### 2. Test Application

1. Start backend: `cd server && npm start`
2. Start frontend: `npm run dev`
3. Try logging in
4. Upload a test image
5. Approve/reject as admin

## 🔧 Troubleshooting

### Issue: Foreign Key Constraints

If you get foreign key errors:

```sql
SET FOREIGN_KEY_CHECKS=0;
-- Run your migration
SET FOREIGN_KEY_CHECKS=1;
```

### Issue: Duplicate Category Names

The new schema enforces unique names at each level. Clean duplicates:

```sql
-- Find duplicates
SELECT name, COUNT(*) 
FROM categories 
GROUP BY name 
HAVING COUNT(*) > 1;

-- Remove duplicates manually
```

### Issue: Images Not Showing

Check file paths and permissions:

```bash
# Ensure uploads directory exists
mkdir -p server/uploads
chmod 755 server/uploads

# Check files exist
ls -la server/uploads/
```

## 📝 Post-Migration Checklist

- [ ] All users can log in
- [ ] Categories show in hierarchical structure
- [ ] Image uploads work with new category selection
- [ ] Existing images display correctly
- [ ] Naming convention validation works
- [ ] Admin can approve/reject images
- [ ] Statistics are accurate
- [ ] No console errors in browser or server

## 🔒 Security Recommendations

After migration:

1. **Change default admin password:**
```sql
UPDATE users SET password = 'new_secure_password' WHERE username = 'admin';
```

2. **Remove test data** (if present)

3. **Implement proper password hashing** (bcrypt recommended)

4. **Set up environment variables** for sensitive config

5. **Configure proper CORS** for production

## 🆘 Need Help?

If you encounter issues:

1. Check server logs: Look at terminal where server is running
2. Check browser console: F12 Developer Tools
3. Check MySQL error logs: Often in `/var/log/mysql/error.log`
4. Review the schema: `DESCRIBE tablename;`

## 📚 Additional Resources

- MySQL Foreign Keys: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- JSON Data Type: https://dev.mysql.com/doc/refman/8.0/en/json.html
- Migration Best Practices: Always test on development/staging first!

---

**Remember:** When in doubt, restore from backup and try again!

```bash
mysql -u root -p image_approval < backup_20260206_120000.sql
```
