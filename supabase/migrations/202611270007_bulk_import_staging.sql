-- P2-M04 Migration 7: Staged Bulk Import batches & rows with composite tenant FK
-- and forced RLS restricted to authorized institutional operators.

CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  data_type text NOT NULL CHECK (
    data_type IN ('students', 'staff', 'subject_enrolments')
  ),
  source_filename text NOT NULL,
  source_format text NOT NULL CHECK (source_format IN ('csv', 'xlsx')),
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'staged' CHECK (
    status IN ('staged', 'validated', 'committed', 'cancelled', 'failed')
  ),
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  committed_rows integer NOT NULL DEFAULT 0,
  created_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  authorized_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  committed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, idempotency_key),
  UNIQUE (institution_id, id)
);

CREATE TABLE public.import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  batch_id uuid NOT NULL,
  row_number integer NOT NULL CHECK (row_number > 0),
  raw_payload jsonb NOT NULL,
  normalized_payload jsonb,
  validation_status text NOT NULL DEFAULT 'pending' CHECK (
    validation_status IN (
      'pending',
      'valid',
      'error',
      'duplicate',
      'committed',
      'skipped'
    )
  ),
  error_messages jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(error_messages) = 'array'
  ),
  target_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (institution_id, batch_id)
    REFERENCES public.import_batches(institution_id, id)
    ON DELETE CASCADE,
  UNIQUE (institution_id, batch_id, row_number)
);

CREATE TRIGGER trg_import_batches_updated_at
  BEFORE UPDATE ON public.import_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_import_rows_updated_at
  BEFORE UPDATE ON public.import_rows
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_import_batches_institution_status_created
  ON public.import_batches (institution_id, status, created_at DESC);

CREATE INDEX idx_import_rows_institution_batch_status
  ON public.import_rows (institution_id, batch_id, validation_status);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches FORCE ROW LEVEL SECURITY;

ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows FORCE ROW LEVEL SECURITY;

CREATE POLICY import_batches_select
  ON public.import_batches
  FOR SELECT
  TO authenticated
  USING (
    (SELECT app_auth.has_institution_permission(institution_id, 'imports.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  );

CREATE POLICY import_batches_insert
  ON public.import_batches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT app_auth.has_institution_permission(institution_id, 'imports.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  );

CREATE POLICY import_batches_update
  ON public.import_batches
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT app_auth.has_institution_permission(institution_id, 'imports.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  )
  WITH CHECK (
    (SELECT app_auth.has_institution_permission(institution_id, 'imports.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  );

CREATE POLICY import_batches_delete
  ON public.import_batches
  FOR DELETE
  TO authenticated
  USING (
    (SELECT app_auth.has_institution_permission(institution_id, 'imports.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  );

CREATE POLICY import_rows_select
  ON public.import_rows
  FOR SELECT
  TO authenticated
  USING (
    (SELECT app_auth.has_institution_permission(institution_id, 'imports.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  );

CREATE POLICY import_rows_insert
  ON public.import_rows
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT app_auth.has_institution_permission(institution_id, 'imports.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  );

CREATE POLICY import_rows_update
  ON public.import_rows
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT app_auth.has_institution_permission(institution_id, 'imports.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  )
  WITH CHECK (
    (SELECT app_auth.has_institution_permission(institution_id, 'imports.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  );

CREATE POLICY import_rows_delete
  ON public.import_rows
  FOR DELETE
  TO authenticated
  USING (
    (SELECT app_auth.has_institution_permission(institution_id, 'imports.manage'))
    OR (SELECT app_auth.has_institution_permission(institution_id, 'people.manage'))
  );
