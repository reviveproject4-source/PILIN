-- Migration: 00042_people_attendance_manual_entry.sql
-- Description: Make attendance_records.check_in_photo_path nullable to support manual attendance entry without photo

ALTER TABLE public.attendance_records
    ALTER COLUMN check_in_photo_path DROP NOT NULL;
