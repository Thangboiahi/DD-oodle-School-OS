-- P1-M03 Migration 3: Private institution storage bucket and path-prefix RLS baseline.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'institution-private',
  'institution-private',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION app_auth.can_write_institution_storage(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN coalesce(
      (storage.foldername(p_object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      false
    )
    THEN
      ((storage.foldername(p_object_name))[1])::uuid IN (SELECT app_auth.active_institution_ids())
      AND app_auth.has_institution_permission(((storage.foldername(p_object_name))[1])::uuid, 'files.write')
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION app_auth.can_write_institution_storage(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_auth.can_write_institution_storage(text) TO authenticated;

CREATE POLICY institution_private_objects_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'institution-private'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM app_auth.active_institution_ids() AS id
    )
  );

CREATE POLICY institution_private_objects_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'institution-private'
    AND app_auth.can_write_institution_storage(name)
  );

CREATE POLICY institution_private_objects_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'institution-private'
    AND app_auth.can_write_institution_storage(name)
  )
  WITH CHECK (
    bucket_id = 'institution-private'
    AND app_auth.can_write_institution_storage(name)
  );

CREATE POLICY institution_private_objects_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'institution-private'
    AND app_auth.can_write_institution_storage(name)
  );
