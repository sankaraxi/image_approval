-- Migration: Add date columns to tasks table
-- Run this SQL in your MySQL client before using the new date features.

ALTER TABLE tasks
  ADD COLUMN start_date DATE DEFAULT NULL AFTER updated_at,
  ADD COLUMN end_date DATE DEFAULT NULL AFTER start_date,
  ADD COLUMN final_review_date DATE DEFAULT NULL AFTER end_date;
