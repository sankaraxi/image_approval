-- ============================================================
-- Migration: Add Agri category, subcategories, and dynamic
--            naming convention fields table
-- ============================================================

-- 1. Naming Convention Fields table (dynamic per-category naming)
CREATE TABLE IF NOT EXISTS `naming_convention_fields` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category_id` INT NOT NULL COMMENT 'Main category (level 1)',
  `field_name` VARCHAR(50) NOT NULL COMMENT 'Internal key e.g. cropName, location',
  `field_label` VARCHAR(100) NOT NULL COMMENT 'Display label e.g. Crop Name',
  `field_type` ENUM('text','select','date') DEFAULT 'text',
  `field_options` JSON DEFAULT NULL COMMENT 'For select: ["Option1","Option2"]',
  `is_required` TINYINT(1) DEFAULT 1,
  `display_order` INT DEFAULT 0,
  `placeholder` VARCHAR(200) DEFAULT NULL,
  `separator` VARCHAR(5) DEFAULT '_' COMMENT 'Separator after this field in filename',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_id`),
  CONSTRAINT `ncf_category_fk` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insert Agri main category
INSERT INTO `categories` (`name`, `level`, `parent_id`, `description`, `naming_prefix`, `is_active`, `display_order`)
VALUES ('Agri', 1, NULL, 'Agriculture sector – crop monitoring and field images', 'AGRI', 1, 3);

SET @agri_id = LAST_INSERT_ID();

-- 3. Sub-categories (level 2) under Agri
INSERT INTO `categories` (`name`, `level`, `parent_id`, `naming_prefix`, `is_active`, `display_order`) VALUES
  ('Crop Type',    2, @agri_id, NULL, 1, 1),
  ('Plant View',   2, @agri_id, NULL, 1, 2),
  ('Time',         2, @agri_id, NULL, 1, 3),
  ('Weather',      2, @agri_id, NULL, 1, 4),
  ('Capture Type', 2, @agri_id, NULL, 1, 5);

-- Fetch sub-category IDs
SET @crop_type_id    = (SELECT id FROM categories WHERE name='Crop Type'    AND parent_id=@agri_id);
SET @plant_view_id   = (SELECT id FROM categories WHERE name='Plant View'   AND parent_id=@agri_id);
SET @time_id         = (SELECT id FROM categories WHERE name='Time'         AND parent_id=@agri_id AND level=2);
SET @weather_id      = (SELECT id FROM categories WHERE name='Weather'      AND parent_id=@agri_id AND level=2);
SET @capture_type_id = (SELECT id FROM categories WHERE name='Capture Type' AND parent_id=@agri_id);

-- 4. Sub-sub-categories (level 3)

-- Crop Type options
INSERT INTO `categories` (`name`, `level`, `parent_id`, `is_active`, `display_order`) VALUES
  ('Healthy Plant',       3, @crop_type_id, 1, 1),
  ('Diseased Plant',      3, @crop_type_id, 1, 2),
  ('Pest-Affected Plant', 3, @crop_type_id, 1, 3);

-- Plant View options
INSERT INTO `categories` (`name`, `level`, `parent_id`, `is_active`, `display_order`) VALUES
  ('Whole Plant',      3, @plant_view_id, 1, 1),
  ('Leaf Close-Up',    3, @plant_view_id, 1, 2),
  ('Field-Level View', 3, @plant_view_id, 1, 3);

-- Time options (reuse concept but under Agri parent)
INSERT INTO `categories` (`name`, `level`, `parent_id`, `is_active`, `display_order`) VALUES
  ('Day',     3, @time_id, 1, 1),
  ('Evening', 3, @time_id, 1, 2),
  ('Night',   3, @time_id, 1, 3),
  ('Dusk',    3, @time_id, 1, 4),
  ('Dawn',    3, @time_id, 1, 5);

-- Weather options
INSERT INTO `categories` (`name`, `level`, `parent_id`, `is_active`, `display_order`) VALUES
  ('Rainy',                        3, @weather_id, 1, 1),
  ('Sunny',                        3, @weather_id, 1, 2),
  ('Fog/Smog',                     3, @weather_id, 1, 3),
  ('Post-Rain Wet Field',          3, @weather_id, 1, 4),
  ('Morning Dew / Leaf Wetness',   3, @weather_id, 1, 5),
  ('Cold / Frost Risk',            3, @weather_id, 1, 6),
  ('Partial Cloudy',               3, @weather_id, 1, 7),
  ('Continuous Rain (Monsoon)',    3, @weather_id, 1, 8);

-- Capture Type options
INSERT INTO `categories` (`name`, `level`, `parent_id`, `is_active`, `display_order`) VALUES
  ('Field Walk Capture (Farmer Scouting)',  3, @capture_type_id, 1, 1),
  ('Manual Plant Inspection',               3, @capture_type_id, 1, 2),
  ('Close Observation Capture (Leaf/Pest)', 3, @capture_type_id, 1, 3),
  ('On-Vehicle Field Survey',               3, @capture_type_id, 1, 4),
  ('Drone Capture',                         3, @capture_type_id, 1, 5),
  ('Fixed Camera Capture',                  3, @capture_type_id, 1, 6);

-- 5. Naming convention fields for AGRI
--    Format: cropName_state_district_date_observedCondition
--    Example: Chilli_Kerala_Palakkad_24022026_healthyPlant
INSERT INTO `naming_convention_fields`
  (`category_id`, `field_name`, `field_label`, `field_type`, `field_options`, `is_required`, `display_order`, `placeholder`, `separator`) VALUES
  (@agri_id, 'cropName',          'Crop Name',          'text',   NULL, 1, 1, 'e.g. Chilli, Rice, Cotton',                 '_'),
  (@agri_id, 'state',             'State',              'text',   NULL, 1, 2, 'e.g. Kerala, TamilNadu',                    '_'),
  (@agri_id, 'district',          'District',           'text',   NULL, 1, 3, 'e.g. Palakkad, Coimbatore',                 '_'),
  (@agri_id, 'date',              'Date (DDMMYYYY)',    'date',   NULL, 1, 4, 'e.g. 24022026',                             '_'),
  (@agri_id, 'observedCondition', 'Observed Condition', 'select', '["healthyPlant","diseasedPlant","pestAffected","leafDamage","fruitRot","wiltSymptom","nutrientDeficiency","normalGrowth"]', 1, 5, 'Select condition', '');


