-- P2-M04 pgTAP verification: bulk import staging forced RLS, cross-tenant isolation,
-- composite FK protection, per-institution idempotency keys, and strict role denial.

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;

SET LOCAL search_path = public, extensions;

SELECT plan(22);

-- 1. Both import staging tables have ENABLE and FORCE ROW LEVEL SECURITY
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('import_batches', 'import_rows')
      AND c.relrowsecurity = true
      AND c.relforcerowsecurity = true
  ),
  2,
  'import_batches and import_rows enforce ENABLE and FORCE ROW LEVEL SECURITY'
);

-- 2. anon sees 0 rows
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::int FROM public.import_batches), 0, 'anon sees 0 import_batches');
SELECT is((SELECT count(*)::int FROM public.import_rows), 0, 'anon sees 0 import_rows');
RESET ROLE;

-- 3. Sunrise Principal (2222...2201) stages batch & row inside Sunrise, blocked across tenants & duplicates
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222201","role":"authenticated","aud":"authenticated"}',
  true
);

SELECT lives_ok(
  $$INSERT INTO public.import_batches (
      id, institution_id, idempotency_key, data_type, source_filename, source_format, total_rows
    ) VALUES (
      'dddddddd-dddd-4ddd-8ddd-dddddddd0001',
      '11111111-1111-4111-8111-111111111101',
      'batch-shared-key',
      'students',
      'students.csv',
      'csv',
      1
    )$$,
  'Sunrise Principal can insert import_batches in Sunrise'
);

SELECT lives_ok(
  $$INSERT INTO public.import_rows (
      institution_id, batch_id, row_number, raw_payload
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'dddddddd-dddd-4ddd-8ddd-dddddddd0001',
      1,
      '{"admission_number":"ADM-SR-999","full_name":"Test Student"}'::jsonb
    )$$,
  'Sunrise Principal can insert import_rows in Sunrise'
);

SELECT is((SELECT count(*)::int FROM public.import_batches), 1, 'Sunrise Principal sees 1 Sunrise import_batches row');
SELECT is((SELECT count(*)::int FROM public.import_rows), 1, 'Sunrise Principal sees 1 Sunrise import_rows row');

SELECT throws_ok(
  $$INSERT INTO public.import_batches (
      institution_id, idempotency_key, data_type, source_filename, source_format
    ) VALUES (
      '11111111-1111-4111-8111-111111111102',
      'hack-valley-key',
      'students',
      'hack.csv',
      'csv'
    )$$,
  '42501',
  NULL,
  'Sunrise Principal is denied inserting import_batches for Valley'
);

SELECT throws_ok(
  $$INSERT INTO public.import_batches (
      institution_id, idempotency_key, data_type, source_filename, source_format
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'batch-shared-key',
      'students',
      'dup.csv',
      'csv'
    )$$,
  '23505',
  NULL,
  'Duplicate (institution_id, idempotency_key) is rejected in Sunrise'
);

-- 4. Valley Principal (2222...2203) can reuse the same idempotency_key inside Valley, sees 0 Sunrise rows, and cannot link cross-tenant batch_id
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222203","role":"authenticated","aud":"authenticated"}',
  true
);

SELECT lives_ok(
  $$INSERT INTO public.import_batches (
      id, institution_id, idempotency_key, data_type, source_filename, source_format
    ) VALUES (
      'dddddddd-dddd-4ddd-8ddd-dddddddd0002',
      '11111111-1111-4111-8111-111111111102',
      'batch-shared-key',
      'staff',
      'valley-staff.csv',
      'csv'
    )$$,
  'Valley Principal can use same idempotency_key scoped to Valley'
);

SELECT is(
  (SELECT count(*)::int FROM public.import_batches WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  0,
  'Valley Principal sees 0 Sunrise import_batches'
);

SELECT is(
  (SELECT count(*)::int FROM public.import_rows WHERE institution_id = '11111111-1111-4111-8111-111111111101'),
  0,
  'Valley Principal sees 0 Sunrise import_rows'
);

SELECT throws_ok(
  $$INSERT INTO public.import_rows (
      institution_id, batch_id, row_number, raw_payload
    ) VALUES (
      '11111111-1111-4111-8111-111111111102',
      'dddddddd-dddd-4ddd-8ddd-dddddddd0001',
      1,
      '{"full_name":"Cross Tenant Link"}'::jsonb
    )$$,
  '23503',
  NULL,
  'Composite FK prevents linking Valley import_rows to Sunrise batch_id'
);

-- 5. Dual member (2222...2202: Subject Teacher in Sunrise, Guardian in Valley) is denied all access
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222202","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is((SELECT count(*)::int FROM public.import_batches), 0, 'dual.member sees 0 import_batches');
SELECT is((SELECT count(*)::int FROM public.import_rows), 0, 'dual.member sees 0 import_rows');
SELECT throws_ok(
  $$INSERT INTO public.import_batches (
      institution_id, idempotency_key, data_type, source_filename, source_format
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'teacher-key',
      'students',
      'teacher.csv',
      'csv'
    )$$,
  '42501',
  NULL,
  'dual.member is denied inserting import_batches'
);

-- 6. Monitor XI-A (2222...2207) is denied all access
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222207","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is((SELECT count(*)::int FROM public.import_batches), 0, 'monitor.11a sees 0 import_batches');
SELECT is((SELECT count(*)::int FROM public.import_rows), 0, 'monitor.11a sees 0 import_rows');
SELECT throws_ok(
  $$INSERT INTO public.import_batches (
      institution_id, idempotency_key, data_type, source_filename, source_format
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'monitor-key',
      'students',
      'monitor.csv',
      'csv'
    )$$,
  '42501',
  NULL,
  'monitor.11a is denied inserting import_batches'
);

-- 7. Platform operator (2222...2204) is denied all access
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222204","role":"authenticated","aud":"authenticated"}',
  true
);
SELECT is((SELECT count(*)::int FROM public.import_batches), 0, 'platform.ops sees 0 import_batches');
SELECT is((SELECT count(*)::int FROM public.import_rows), 0, 'platform.ops sees 0 import_rows');
SELECT throws_ok(
  $$INSERT INTO public.import_batches (
      institution_id, idempotency_key, data_type, source_filename, source_format
    ) VALUES (
      '11111111-1111-4111-8111-111111111101',
      'platform-key',
      'students',
      'platform.csv',
      'csv'
    )$$,
  '42501',
  NULL,
  'platform.ops is denied inserting import_batches'
);

SELECT * FROM finish();

ROLLBACK;
