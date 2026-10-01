-- The existing touch_row trigger preserves created_at on every update.
-- Verification cases were created without that column, so document submission
-- failed when it advanced the case status.
DROP TRIGGER touch_verification_case ON clinzo.verification_case;

ALTER TABLE clinzo.verification_case
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

-- Existing rows predate this column; submitted_at is their creation timestamp.
UPDATE clinzo.verification_case
  SET created_at = submitted_at;

CREATE TRIGGER touch_verification_case BEFORE UPDATE ON clinzo.verification_case
  FOR EACH ROW EXECUTE FUNCTION clinzo.touch_row();
