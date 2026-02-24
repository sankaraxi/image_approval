-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: image_approval
-- ------------------------------------------------------
-- Server version	9.1.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` tinyint NOT NULL COMMENT '1=Main, 2=Sub, 3=SubSub',
  `parent_id` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `naming_prefix` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_level` (`level`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Mobility',1,NULL,NULL,'MOB',1,1,'2026-02-06 07:34:37'),(2,'Road Type',2,1,NULL,NULL,1,1,'2026-02-06 07:34:37'),(3,'Traffic Density',2,1,NULL,NULL,1,2,'2026-02-06 07:34:37'),(4,'Time',2,1,NULL,NULL,1,3,'2026-02-06 07:34:37'),(5,'Weather',2,1,NULL,NULL,1,4,'2026-02-06 07:34:37'),(6,'Motion',2,1,NULL,NULL,1,5,'2026-02-06 07:34:37'),(7,'Urban',3,2,NULL,NULL,1,1,'2026-02-06 07:34:37'),(8,'Semi-urban',3,2,NULL,NULL,1,2,'2026-02-06 07:34:37'),(9,'Rural',3,2,NULL,NULL,1,3,'2026-02-06 07:34:37'),(10,'Highway',3,2,NULL,NULL,1,4,'2026-02-06 07:34:37'),(11,'Bypass',3,2,NULL,NULL,1,5,'2026-02-06 07:34:37'),(12,'Industrial',3,2,NULL,NULL,1,6,'2026-02-06 07:34:37'),(13,'Gated communities',3,2,NULL,NULL,1,7,'2026-02-06 07:34:37'),(14,'Low',3,3,NULL,NULL,1,1,'2026-02-06 07:34:37'),(15,'Medium',3,3,NULL,NULL,1,2,'2026-02-06 07:34:37'),(16,'High',3,3,NULL,NULL,1,3,'2026-02-06 07:34:37'),(17,'Extreme',3,3,NULL,NULL,1,4,'2026-02-06 07:34:37'),(18,'Day',3,4,NULL,NULL,1,1,'2026-02-06 07:34:37'),(19,'Evening',3,4,NULL,NULL,1,2,'2026-02-06 07:34:37'),(20,'Night',3,4,NULL,NULL,1,3,'2026-02-06 07:34:37'),(21,'Dusk',3,4,NULL,NULL,1,4,'2026-02-06 07:34:37'),(22,'Dawn',3,4,NULL,NULL,1,5,'2026-02-06 07:34:37'),(23,'Sunny',3,5,NULL,NULL,1,1,'2026-02-06 07:34:37'),(24,'Rain',3,5,NULL,NULL,1,2,'2026-02-06 07:34:37'),(25,'Fog/Smog',3,5,NULL,NULL,1,3,'2026-02-06 07:34:37'),(26,'Post-rain wet reflective',3,5,NULL,NULL,1,4,'2026-02-06 07:34:37'),(27,'Monsoon splash',3,5,NULL,NULL,1,5,'2026-02-06 07:34:37'),(28,'Static capture (map)',3,6,NULL,NULL,1,1,'2026-02-06 07:34:37'),(29,'On-vehicle capture (AV)',3,6,NULL,NULL,1,2,'2026-02-06 07:34:37'),(30,'Drone capture (behavior analysis)',3,6,NULL,NULL,1,3,'2026-02-06 07:34:37'),(31,'Retail',1,NULL,NULL,'RET',1,2,'2026-02-06 07:34:37'),(32,'Store Type',2,31,NULL,NULL,1,1,'2026-02-06 07:34:37'),(33,'Product Category',2,31,NULL,NULL,1,2,'2026-02-06 07:34:37'),(34,'Shelf Position',2,31,NULL,NULL,1,3,'2026-02-06 07:34:37'),(35,'Capture Angle',2,31,NULL,NULL,1,4,'2026-02-06 07:34:37'),(36,'Store Condition',2,31,NULL,NULL,1,5,'2026-02-06 07:34:37'),(37,'Supermarket',3,32,NULL,NULL,1,1,'2026-02-06 07:34:37'),(38,'Hypermarket',3,32,NULL,NULL,1,2,'2026-02-06 07:34:37'),(39,'Convenience Store',3,32,NULL,NULL,1,3,'2026-02-06 07:34:37'),(40,'Department Store',3,32,NULL,NULL,1,4,'2026-02-06 07:34:37'),(41,'Specialty Store',3,32,NULL,NULL,1,5,'2026-02-06 07:34:37'),(42,'Kirana Store',3,32,NULL,NULL,1,6,'2026-02-06 07:34:37'),(43,'Beverages',3,33,NULL,NULL,1,1,'2026-02-06 07:34:37'),(44,'Snacks',3,33,NULL,NULL,1,2,'2026-02-06 07:34:37'),(45,'Dairy',3,33,NULL,NULL,1,3,'2026-02-06 07:34:37'),(46,'Personal Care',3,33,NULL,NULL,1,4,'2026-02-06 07:34:37'),(47,'Household',3,33,NULL,NULL,1,5,'2026-02-06 07:34:37'),(48,'Frozen Foods',3,33,NULL,NULL,1,6,'2026-02-06 07:34:37'),(49,'Fresh Produce',3,33,NULL,NULL,1,7,'2026-02-06 07:34:37'),(50,'Bakery',3,33,NULL,NULL,1,8,'2026-02-06 07:34:37'),(51,'Top Shelf',3,34,NULL,NULL,1,1,'2026-02-06 07:34:37'),(52,'Eye Level',3,34,NULL,NULL,1,2,'2026-02-06 07:34:37'),(53,'Mid Level',3,34,NULL,NULL,1,3,'2026-02-06 07:34:37'),(54,'Bottom Shelf',3,34,NULL,NULL,1,4,'2026-02-06 07:34:37'),(55,'End Cap',3,34,NULL,NULL,1,5,'2026-02-06 07:34:37'),(56,'Counter Display',3,34,NULL,NULL,1,6,'2026-02-06 07:34:37'),(57,'Front View',3,35,NULL,NULL,1,1,'2026-02-06 07:34:37'),(58,'Left Side',3,35,NULL,NULL,1,2,'2026-02-06 07:34:37'),(59,'Right Side',3,35,NULL,NULL,1,3,'2026-02-06 07:34:37'),(60,'Top View',3,35,NULL,NULL,1,4,'2026-02-06 07:34:37'),(61,'Wide Angle',3,35,NULL,NULL,1,5,'2026-02-06 07:34:37'),(62,'Close-up',3,35,NULL,NULL,1,6,'2026-02-06 07:34:37'),(63,'Well Stocked',3,36,NULL,NULL,1,1,'2026-02-06 07:34:37'),(64,'Partially Stocked',3,36,NULL,NULL,1,2,'2026-02-06 07:34:37'),(65,'Empty Shelves',3,36,NULL,NULL,1,3,'2026-02-06 07:34:37'),(66,'Promotional Display',3,36,NULL,NULL,1,4,'2026-02-06 07:34:37'),(67,'Regular Layout',3,36,NULL,NULL,1,5,'2026-02-06 07:34:37');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `images`
--

DROP TABLE IF EXISTS `images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `student_id` int NOT NULL,
  `filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'System-generated name on disk',
  `original_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'What user uploaded',
  `renamed_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Convention-based name',
  `file_size` bigint DEFAULT NULL,
  `mime_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `main_category_id` int NOT NULL,
  `naming_metadata` json DEFAULT NULL COMMENT 'All naming-convention fields user provided',
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `rejected_by` int DEFAULT NULL,
  `admin_notes` text COLLATE utf8mb4_unicode_ci,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `main_category_id` (`main_category_id`),
  KEY `approved_by` (`approved_by`),
  KEY `rejected_by` (`rejected_by`),
  KEY `idx_task` (`task_id`),
  KEY `idx_student` (`student_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `images_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `images_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `images_ibfk_3` FOREIGN KEY (`main_category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `images_ibfk_4` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `images_ibfk_5` FOREIGN KEY (`rejected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `images`
--

LOCK TABLES `images` WRITE;
/*!40000 ALTER TABLE `images` DISABLE KEYS */;
INSERT INTO `images` VALUES (1,1,2,'MOB_BLR_RC_20260202_F001.jpg','city-1030x685.jpg','MOB_BLR_RC_20260202_F001.jpg',35718,'image/jpeg',1,'{\"city\": \"BLR\", \"date\": \"20260202\", \"index\": 1, \"camera\": \"RC\", \"generatedName\": \"MOB_BLR_RC_20260202_F001.jpg\", \"studentSubSelections\": {}}','pending',NULL,NULL,NULL,'2026-02-06 07:37:03',NULL,NULL),(2,1,2,'MOB_BLR_RC_20260202_F002.jpg','images.jpg','MOB_BLR_RC_20260202_F002.jpg',12972,'image/jpeg',1,'{\"city\": \"BLR\", \"date\": \"20260202\", \"index\": 2, \"camera\": \"RC\", \"generatedName\": \"MOB_BLR_RC_20260202_F002.jpg\", \"studentSubSelections\": {}}','approved',1,NULL,NULL,'2026-02-06 07:37:03','2026-02-06 07:42:18',NULL);
/*!40000 ALTER TABLE `images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_subcategory_requirements`
--

DROP TABLE IF EXISTS `task_subcategory_requirements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_subcategory_requirements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `subcategory_id` int NOT NULL COMMENT 'Level-2 category',
  `subsub_category_id` int DEFAULT NULL COMMENT 'Level-3 category (NULL = student picks)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_task_sub` (`task_id`,`subcategory_id`),
  KEY `subcategory_id` (`subcategory_id`),
  KEY `subsub_category_id` (`subsub_category_id`),
  CONSTRAINT `task_subcategory_requirements_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_subcategory_requirements_ibfk_2` FOREIGN KEY (`subcategory_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `task_subcategory_requirements_ibfk_3` FOREIGN KEY (`subsub_category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_subcategory_requirements`
--

LOCK TABLES `task_subcategory_requirements` WRITE;
/*!40000 ALTER TABLE `task_subcategory_requirements` DISABLE KEYS */;
INSERT INTO `task_subcategory_requirements` VALUES (1,1,2,7),(2,1,3,14),(3,1,4,18),(4,1,5,25),(5,1,6,28),(16,4,2,NULL),(17,4,3,NULL),(18,4,4,NULL),(19,4,5,NULL),(20,4,6,NULL),(26,6,2,7),(27,6,3,15),(28,6,4,19),(29,6,5,24),(30,6,6,28),(36,5,32,NULL),(37,5,33,NULL),(38,5,34,NULL),(39,5,35,NULL),(40,5,36,NULL);
/*!40000 ALTER TABLE `task_subcategory_requirements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `main_category_id` int NOT NULL,
  `total_images` int NOT NULL DEFAULT '100',
  `uploaded_count` int NOT NULL DEFAULT '0',
  `approved_count` int NOT NULL DEFAULT '0',
  `rejected_count` int NOT NULL DEFAULT '0',
  `subcategories_specified` tinyint(1) DEFAULT '0' COMMENT 'TRUE = admin picked sub-sub values',
  `status` enum('open','in_progress','completed','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `main_category_id` (`main_category_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_status` (`status`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`main_category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES (1,'Coimbatore Roads','Images for Coimbatore',1,100,2,1,0,1,'in_progress',1,'2026-02-06 07:34:47','2026-02-06 07:42:19'),(4,'test mail','test desc',1,100,0,0,0,0,'open',5,'2026-02-12 09:32:22','2026-02-12 09:32:22'),(5,'test mail iifrrdee5','test descri',31,1004,0,0,0,0,'open',5,'2026-02-12 09:33:28','2026-02-24 09:30:03'),(6,'test again for mail trigger','df',1,100,0,0,0,1,'open',5,'2026-02-12 10:32:00','2026-02-12 10:32:00');
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','student') COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin123','admin',NULL,'System Admin','2026-02-06 07:34:37'),(2,'student','student1','student',NULL,'Student','2026-02-06 07:35:42'),(3,'student2','student23','student',NULL,'Student A','2026-02-06 08:00:17'),(4,'robin_joshi','evaluator1@123','admin',NULL,'Robin Joshi','2026-02-06 17:40:59'),(5,'prajwal_pb','evaluator2@123','admin',NULL,'Prajwal Pb','2026-02-06 17:41:47'),(6,'mamybin_k_uthuppan','evaluator3@123','admin',NULL,'MaMybin K Uthuppan','2026-02-06 17:42:05'),(7,'demouser@kggeniuslabs.com','demouser1@123','student','','Demo User','2026-02-06 17:43:33'),(8,'suganya_gautam','evaluator4@123','admin',NULL,'Suganya Gautam','2026-02-12 06:20:11');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-24 15:10:38
