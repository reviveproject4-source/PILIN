-- Migration: 00045_prevent_overlapping_leave.sql
-- Description: Prevent overlapping active leave requests for the same employee in the same tenant

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.attendance_requests
ADD CONSTRAINT chk_leave_no_overlap
EXCLUDE USING gist (
  business_id WITH =,
  employee_id WITH =,
  daterange(start_date, end_date, '[]') WITH &&
)
WHERE (status IN ('SUBMITTED', 'APPROVED'));
