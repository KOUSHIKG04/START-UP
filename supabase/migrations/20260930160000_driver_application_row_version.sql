-- The shared touch_row trigger increments row_version on every update.
-- Add it to the application table before draft edits or submission occur.
ALTER TABLE clinzo.driver_registration_application
  ADD COLUMN row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0);
