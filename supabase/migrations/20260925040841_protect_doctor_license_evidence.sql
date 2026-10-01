-- Credential evidence must remain available to the manual reviewer.
DROP POLICY "doctor_license_delete_own" ON storage.objects;
