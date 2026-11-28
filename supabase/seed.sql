-- 100% synthetic two-institution development & RLS verification seed.
-- Zero real student, parent, staff, or institutional PII.

BEGIN;

SET LOCAL search_path = public, extensions;

-- Deterministic synthetic institution UUIDs
-- sunrise-cbse: 11111111-1111-4111-8111-111111111101
-- valley-cbse:  11111111-1111-4111-8111-111111111102

-- Synthetic GoTrue fixture password for local/CI Playwright E2E only (NEVER production):
--   DdOodleTest#2026!
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '22222222-2222-4222-8222-222222222201',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'principal.sunrise@example.test',
    extensions.crypt('DdOodleTest#2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dual.member@example.test',
    extensions.crypt('DdOodleTest#2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'principal.valley@example.test',
    extensions.crypt('DdOodleTest#2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'platform.ops@example.test',
    extensions.crypt('DdOodleTest#2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222205',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'hod.srsec.sunrise@example.test',
    extensions.crypt('DdOodleTest#2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222206',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'classteacher.11a.sunrise@example.test',
    extensions.crypt('DdOodleTest#2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222207',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'monitor.11a.sunrise@example.test',
    extensions.crypt('DdOodleTest#2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222208',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'student.11b.sunrise@example.test',
    extensions.crypt('DdOodleTest#2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    '22222222-2222-4222-9222-222222222201',
    '22222222-2222-4222-8222-222222222201',
    '22222222-2222-4222-8222-222222222201',
    '{"sub":"22222222-2222-4222-8222-222222222201","email":"principal.sunrise@example.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-4222-9222-222222222202',
    '22222222-2222-4222-8222-222222222202',
    '22222222-2222-4222-8222-222222222202',
    '{"sub":"22222222-2222-4222-8222-222222222202","email":"dual.member@example.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-4222-9222-222222222203',
    '22222222-2222-4222-8222-222222222203',
    '22222222-2222-4222-8222-222222222203',
    '{"sub":"22222222-2222-4222-8222-222222222203","email":"principal.valley@example.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-4222-9222-222222222204',
    '22222222-2222-4222-8222-222222222204',
    '22222222-2222-4222-8222-222222222204',
    '{"sub":"22222222-2222-4222-8222-222222222204","email":"platform.ops@example.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-4222-9222-222222222205',
    '22222222-2222-4222-8222-222222222205',
    '22222222-2222-4222-8222-222222222205',
    '{"sub":"22222222-2222-4222-8222-222222222205","email":"hod.srsec.sunrise@example.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-4222-9222-222222222206',
    '22222222-2222-4222-8222-222222222206',
    '22222222-2222-4222-8222-222222222206',
    '{"sub":"22222222-2222-4222-8222-222222222206","email":"classteacher.11a.sunrise@example.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-4222-9222-222222222207',
    '22222222-2222-4222-8222-222222222207',
    '22222222-2222-4222-8222-222222222207',
    '{"sub":"22222222-2222-4222-8222-222222222207","email":"monitor.11a.sunrise@example.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-4222-9222-222222222208',
    '22222222-2222-4222-8222-222222222208',
    '22222222-2222-4222-8222-222222222208',
    '{"sub":"22222222-2222-4222-8222-222222222208","email":"student.11b.sunrise@example.test","email_verified":true,"phone_verified":false}'::jsonb,
    'email',
    now(),
    now(),
    now()
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.persons (id, auth_user_id, full_name, display_name, primary_email, status)
VALUES
  (
    '33333333-3333-4333-8333-333333333301',
    '22222222-2222-4222-8222-222222222201',
    'Synthetic Sunrise Principal',
    'Principal (Sunrise)',
    'principal.sunrise@example.test',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    '22222222-2222-4222-8222-222222222202',
    'Synthetic Dual Member',
    'Teacher & Guardian',
    'dual.member@example.test',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333303',
    '22222222-2222-4222-8222-222222222203',
    'Synthetic Valley Principal',
    'Principal (Valley)',
    'principal.valley@example.test',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333304',
    '22222222-2222-4222-8222-222222222204',
    'Synthetic Platform Operator',
    'Platform Ops',
    'platform.ops@example.test',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333305',
    '22222222-2222-4222-8222-222222222205',
    'Synthetic Sr Sec HOD',
    'HOD Senior Secondary',
    'hod.srsec.sunrise@example.test',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333306',
    '22222222-2222-4222-8222-222222222206',
    'Synthetic Class Teacher 11A',
    'Class Teacher XI-A',
    'classteacher.11a.sunrise@example.test',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333307',
    '22222222-2222-4222-8222-222222222207',
    'Diya Nair',
    'Diya Nair (Monitor XI-A)',
    'monitor.11a.sunrise@example.test',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333308',
    '22222222-2222-4222-8222-222222222208',
    'Rohan Sen',
    'Rohan Sen (XI-B)',
    'student.11b.sunrise@example.test',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333309',
    NULL,
    'Aarav Verma',
    'Aarav Verma (XI-A)',
    NULL,
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333310',
    NULL,
    'Meera Das',
    'Meera Das (XI-B)',
    NULL,
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333311',
    NULL,
    'Kabir Rao',
    'Kabir Rao (Valley XI-A)',
    NULL,
    'active'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_operators (person_id, operator_role, status)
VALUES
  ('33333333-3333-4333-8333-333333333304', 'super_admin', 'active')
ON CONFLICT (person_id) DO NOTHING;

INSERT INTO public.institutions (id, slug, name, board, status, default_theme_family, timezone)
VALUES
  (
    '11111111-1111-4111-8111-111111111101',
    'sunrise-cbse',
    'Sunrise Synthetic CBSE Academy',
    'CBSE',
    'active',
    'clarity',
    'Asia/Kolkata'
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'valley-cbse',
    'Valley Synthetic CBSE Senior Secondary',
    'CBSE',
    'active',
    'calm',
    'Asia/Kolkata'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.institution_memberships (id, institution_id, person_id, status)
VALUES
  (
    '44444444-4444-4444-8444-444444444401',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333301',
    'active'
  ),
  (
    '44444444-4444-4444-8444-444444444402',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333302',
    'active'
  ),
  (
    '44444444-4444-4444-8444-444444444403',
    '11111111-1111-4111-8111-111111111102',
    '33333333-3333-4333-8333-333333333302',
    'active'
  ),
  (
    '44444444-4444-4444-8444-444444444404',
    '11111111-1111-4111-8111-111111111102',
    '33333333-3333-4333-8333-333333333303',
    'active'
  ),
  (
    '44444444-4444-4444-8444-444444444405',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333305',
    'active'
  ),
  (
    '44444444-4444-4444-8444-444444444406',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333306',
    'active'
  ),
  (
    '44444444-4444-4444-8444-444444444407',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333307',
    'active'
  ),
  (
    '44444444-4444-4444-8444-444444444408',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333308',
    'active'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.institution_roles (id, institution_id, code, name, description, is_system, is_active, permissions)
VALUES
  -- Sunrise CBSE roles
  ('55555555-5555-4555-8555-555555555101', '11111111-1111-4111-8111-111111111101', 'principal', 'Principal', 'Full institutional governance', true, true, '["institution.*"]'::jsonb),
  ('55555555-5555-4555-8555-555555555102', '11111111-1111-4111-8111-111111111101', 'vice_principal', 'Vice Principal', 'Academic and operations leadership', true, true, '["people.read","memberships.read","roles.read","audit.read","files.write"]'::jsonb),
  ('55555555-5555-4555-8555-555555555103', '11111111-1111-4111-8111-111111111101', 'hod', 'Head of Department', 'Department academic coordination', true, true, '["academics.manage"]'::jsonb),
  ('55555555-5555-4555-8555-555555555104', '11111111-1111-4111-8111-111111111101', 'class_teacher', 'Class Teacher', 'Section coordination and attendance', true, true, '["section.coordinate"]'::jsonb),
  ('55555555-5555-4555-8555-555555555105', '11111111-1111-4111-8111-111111111101', 'subject_teacher', 'Subject Teacher', 'Teaching group instruction and assessments', true, true, '["academics.teach"]'::jsonb),
  ('55555555-5555-4555-8555-555555555106', '11111111-1111-4111-8111-111111111101', 'parent_guardian', 'Parent / Guardian', 'Ward records and guardian communications', true, true, '["ward.read"]'::jsonb),
  ('55555555-5555-4555-8555-555555555107', '11111111-1111-4111-8111-111111111101', 'student', 'Student', 'Student handbook, timetable and coursework', true, true, '["self.read"]'::jsonb),
  ('55555555-5555-4555-8555-555555555108', '11111111-1111-4111-8111-111111111101', 'monitor', 'Class Monitor / Monitress', 'Read-only classroom summary coordination', true, true, '["classroom.summary.read"]'::jsonb),

  -- Valley CBSE roles
  ('55555555-5555-4555-8555-555555555201', '11111111-1111-4111-8111-111111111102', 'principal', 'Principal', 'Full institutional governance', true, true, '["institution.*"]'::jsonb),
  ('55555555-5555-4555-8555-555555555202', '11111111-1111-4111-8111-111111111102', 'vice_principal', 'Vice Principal', 'Academic and operations leadership', true, true, '["people.read","memberships.read","roles.read","audit.read","files.write"]'::jsonb),
  ('55555555-5555-4555-8555-555555555203', '11111111-1111-4111-8111-111111111102', 'hod', 'Head of Department', 'Department academic coordination', true, true, '["academics.manage"]'::jsonb),
  ('55555555-5555-4555-8555-555555555204', '11111111-1111-4111-8111-111111111102', 'class_teacher', 'Class Teacher', 'Section coordination and attendance', true, true, '["section.coordinate"]'::jsonb),
  ('55555555-5555-4555-8555-555555555205', '11111111-1111-4111-8111-111111111102', 'subject_teacher', 'Subject Teacher', 'Teaching group instruction and assessments', true, true, '["academics.teach"]'::jsonb),
  ('55555555-5555-4555-8555-555555555206', '11111111-1111-4111-8111-111111111102', 'parent_guardian', 'Parent / Guardian', 'Ward records and guardian communications', true, true, '["ward.read"]'::jsonb),
  ('55555555-5555-4555-8555-555555555207', '11111111-1111-4111-8111-111111111102', 'student', 'Student', 'Student handbook, timetable and coursework', true, true, '["self.read"]'::jsonb),
  ('55555555-5555-4555-8555-555555555208', '11111111-1111-4111-8111-111111111102', 'monitor', 'Class Monitor / Monitress', 'Read-only classroom summary coordination', true, true, '["classroom.summary.read"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_assignments (
  id,
  institution_id,
  membership_id,
  role_id,
  scope_type,
  starts_at,
  ends_at,
  status,
  assigned_by_person_id
)
VALUES
  (
    '66666666-6666-4666-8666-666666666601',
    '11111111-1111-4111-8111-111111111101',
    '44444444-4444-4444-8444-444444444401',
    '55555555-5555-4555-8555-555555555101',
    'institution',
    now() - interval '1 day',
    NULL,
    'active',
    '33333333-3333-4333-8333-333333333301'
  ),
  (
    '66666666-6666-4666-8666-666666666602',
    '11111111-1111-4111-8111-111111111101',
    '44444444-4444-4444-8444-444444444402',
    '55555555-5555-4555-8555-555555555105',
    'teaching_group',
    now() - interval '1 day',
    NULL,
    'active',
    '33333333-3333-4333-8333-333333333301'
  ),
  (
    '66666666-6666-4666-8666-666666666603',
    '11111111-1111-4111-8111-111111111102',
    '44444444-4444-4444-8444-444444444403',
    '55555555-5555-4555-8555-555555555206',
    'self',
    now() - interval '1 day',
    NULL,
    'active',
    '33333333-3333-4333-8333-333333333303'
  ),
  (
    '66666666-6666-4666-8666-666666666604',
    '11111111-1111-4111-8111-111111111102',
    '44444444-4444-4444-8444-444444444404',
    '55555555-5555-4555-8555-555555555201',
    'institution',
    now() - interval '1 day',
    NULL,
    'active',
    '33333333-3333-4333-8333-333333333303'
  ),
  (
    '66666666-6666-4666-8666-666666666605',
    '11111111-1111-4111-8111-111111111101',
    '44444444-4444-4444-8444-444444444405',
    '55555555-5555-4555-8555-555555555103',
    'department',
    now() - interval '1 day',
    NULL,
    'active',
    '33333333-3333-4333-8333-333333333301'
  ),
  (
    '66666666-6666-4666-8666-666666666606',
    '11111111-1111-4111-8111-111111111101',
    '44444444-4444-4444-8444-444444444406',
    '55555555-5555-4555-8555-555555555104',
    'section',
    now() - interval '1 day',
    NULL,
    'active',
    '33333333-3333-4333-8333-333333333301'
  ),
  (
    '66666666-6666-4666-8666-666666666607',
    '11111111-1111-4111-8111-111111111101',
    '44444444-4444-4444-8444-444444444407',
    '55555555-5555-4555-8555-555555555107',
    'self',
    now() - interval '1 day',
    NULL,
    'active',
    '33333333-3333-4333-8333-333333333301'
  ),
  (
    '66666666-6666-4666-8666-666666666608',
    '11111111-1111-4111-8111-111111111101',
    '44444444-4444-4444-8444-444444444407',
    '55555555-5555-4555-8555-555555555108',
    'section',
    now() - interval '1 day',
    NULL,
    'active',
    '33333333-3333-4333-8333-333333333301'
  ),
  (
    '66666666-6666-4666-8666-666666666609',
    '11111111-1111-4111-8111-111111111101',
    '44444444-4444-4444-8444-444444444408',
    '55555555-5555-4555-8555-555555555107',
    'self',
    now() - interval '1 day',
    NULL,
    'active',
    '33333333-3333-4333-8333-333333333301'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- Phase 2 Synthetic Registry & CBSE XI-XII Reference Academic Model
-- =====================================================================

INSERT INTO public.student_profiles (
  id,
  institution_id,
  person_id,
  membership_id,
  admission_number,
  admission_date,
  lifecycle_status,
  gender,
  pen_number,
  external_id_verification_status
)
VALUES
  (
    '88888888-8888-4888-8888-888888880101',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333309',
    NULL,
    'ADM-SR-2026-001',
    '2026-04-01',
    'active',
    'male',
    'PEN-SYNTH-SR-001',
    'pending'
  ),
  (
    '88888888-8888-4888-8888-888888880102',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333307',
    '44444444-4444-4444-8444-444444444407',
    'ADM-SR-2026-002',
    '2026-04-01',
    'active',
    'female',
    'PEN-SYNTH-SR-002',
    'verified'
  ),
  (
    '88888888-8888-4888-8888-888888880103',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333308',
    '44444444-4444-4444-8444-444444444408',
    'ADM-SR-2026-003',
    '2026-04-01',
    'active',
    'male',
    NULL,
    'unverified'
  ),
  (
    '88888888-8888-4888-8888-888888880104',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333310',
    NULL,
    'ADM-SR-2026-004',
    '2026-04-01',
    'active',
    'female',
    NULL,
    'unverified'
  ),
  (
    '88888888-8888-4888-8888-888888880201',
    '11111111-1111-4111-8111-111111111102',
    '33333333-3333-4333-8333-333333333311',
    NULL,
    'ADM-VL-2026-001',
    '2026-04-01',
    'active',
    'male',
    NULL,
    'unverified'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff_profiles (
  id,
  institution_id,
  person_id,
  membership_id,
  employee_code,
  designation,
  employment_type,
  lifecycle_status,
  joining_date
)
VALUES
  (
    '88888888-8888-4888-8888-888888881101',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333302',
    '44444444-4444-4444-8444-444444444402',
    'EMP-SR-001',
    'PGT Applied Mathematics',
    'full_time',
    'active',
    '2024-04-01'
  ),
  (
    '88888888-8888-4888-8888-888888881102',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333305',
    '44444444-4444-4444-8444-444444444405',
    'EMP-SR-002',
    'Head of Senior Secondary',
    'full_time',
    'active',
    '2022-04-01'
  ),
  (
    '88888888-8888-4888-8888-888888881103',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333306',
    '44444444-4444-4444-8444-444444444406',
    'EMP-SR-003',
    'Class Teacher XI-A',
    'full_time',
    'active',
    '2023-04-01'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_guardians (
  id,
  institution_id,
  student_profile_id,
  guardian_person_id,
  relationship,
  is_primary,
  can_view_academics,
  can_receive_notices,
  can_pickup,
  status
)
VALUES
  (
    '88888888-8888-4888-8888-888888882201',
    '11111111-1111-4111-8111-111111111102',
    '88888888-8888-4888-8888-888888880201',
    '33333333-3333-4333-8333-333333333302',
    'father',
    true,
    true,
    true,
    true,
    'active'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.academic_sessions (id, institution_id, code, name, starts_on, ends_on, status)
VALUES
  ('99999999-9999-4999-8999-999999990101', '11111111-1111-4111-8111-111111111101', 'AY-2026-27', 'Academic Session 2026-27', '2026-04-01', '2027-03-31', 'active'),
  ('99999999-9999-4999-8999-999999990201', '11111111-1111-4111-8111-111111111102', 'AY-2026-27', 'Academic Session 2026-27', '2026-04-01', '2027-03-31', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.academic_terms (id, institution_id, session_id, code, name, sequence_no, starts_on, ends_on)
VALUES
  ('99999999-9999-4999-8999-999999991101', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', 'TERM-1', 'Term 1 (Apr-Sep)', 1, '2026-04-01', '2026-09-30'),
  ('99999999-9999-4999-8999-999999991102', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', 'TERM-2', 'Term 2 (Oct-Mar)', 2, '2026-10-01', '2027-03-31'),
  ('99999999-9999-4999-8999-999999991201', '11111111-1111-4111-8111-111111111102', '99999999-9999-4999-8999-999999990201', 'TERM-1', 'Term 1 (Apr-Sep)', 1, '2026-04-01', '2026-09-30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.academic_departments (id, institution_id, code, name, department_kind, description)
VALUES
  ('99999999-9999-4999-8999-999999992101', '11111111-1111-4111-8111-111111111101', 'SR-SEC', 'Senior Secondary', 'class_band', 'CBSE Classes XI and XII'),
  ('99999999-9999-4999-8999-999999992201', '11111111-1111-4111-8111-111111111102', 'SR-SEC', 'Senior Secondary', 'class_band', 'Valley Senior Secondary')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.grade_levels (id, institution_id, department_id, code, name, display_order)
VALUES
  ('99999999-9999-4999-8999-999999993101', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999992101', 'XI', 'Class XI', 11),
  ('99999999-9999-4999-8999-999999993102', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999992101', 'XII', 'Class XII', 12),
  ('99999999-9999-4999-8999-999999993201', '11111111-1111-4111-8111-111111111102', '99999999-9999-4999-8999-999999992201', 'XI', 'Class XI', 11)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sections (id, institution_id, session_id, grade_level_id, code, name, room_label, capacity)
VALUES
  ('99999999-9999-4999-8999-999999994101', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999993101', 'XI-A', 'XI-A', 'Block B - 201', 40),
  ('99999999-9999-4999-8999-999999994102', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999993101', 'XI-B', 'XI-B', 'Block B - 202', 40),
  ('99999999-9999-4999-8999-999999994201', '11111111-1111-4111-8111-111111111102', '99999999-9999-4999-8999-999999990201', '99999999-9999-4999-8999-999999993201', 'XI-A', 'XI-A', 'North Wing 101', 40)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.streams (id, institution_id, code, name, description)
VALUES
  ('99999999-9999-4999-8999-999999995101', '11111111-1111-4111-8111-111111111101', 'SCIENCE', 'Science', 'Senior Secondary Science Stream'),
  ('99999999-9999-4999-8999-999999995102', '11111111-1111-4111-8111-111111111101', 'COMMERCE', 'Commerce', 'Senior Secondary Commerce Stream'),
  ('99999999-9999-4999-8999-999999995201', '11111111-1111-4111-8111-111111111102', 'SCIENCE', 'Science', 'Valley Science Stream')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subjects (id, institution_id, code, name, board_subject_code, category)
VALUES
  ('99999999-9999-4999-8999-999999996101', '11111111-1111-4111-8111-111111111101', 'ENG-CORE', 'English Core', '301', 'core'),
  ('99999999-9999-4999-8999-999999996102', '11111111-1111-4111-8111-111111111101', 'PHY', 'Physics', '042', 'elective'),
  ('99999999-9999-4999-8999-999999996103', '11111111-1111-4111-8111-111111111101', 'ACC', 'Accountancy', '055', 'elective'),
  ('99999999-9999-4999-8999-999999996104', '11111111-1111-4111-8111-111111111101', 'APP-MATH', 'Applied Mathematics', '241', 'elective'),
  ('99999999-9999-4999-8999-999999996105', '11111111-1111-4111-8111-111111111101', 'CS', 'Computer Science', '083', 'elective'),
  ('99999999-9999-4999-8999-999999996201', '11111111-1111-4111-8111-111111111102', 'ENG-CORE', 'English Core', '301', 'core')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subject_offerings (id, institution_id, session_id, grade_level_id, subject_id, stream_id, is_mandatory, max_students)
VALUES
  ('99999999-9999-4999-8999-999999997101', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999993101', '99999999-9999-4999-8999-999999996101', NULL, true, NULL),
  ('99999999-9999-4999-8999-999999997102', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999993101', '99999999-9999-4999-8999-999999996102', '99999999-9999-4999-8999-999999995101', true, 40),
  ('99999999-9999-4999-8999-999999997103', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999993101', '99999999-9999-4999-8999-999999996103', '99999999-9999-4999-8999-999999995102', true, 40),
  ('99999999-9999-4999-8999-999999997104', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999993101', '99999999-9999-4999-8999-999999996104', NULL, false, 35),
  ('99999999-9999-4999-8999-999999997105', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999993101', '99999999-9999-4999-8999-999999996105', NULL, false, 35),
  ('99999999-9999-4999-8999-999999997201', '11111111-1111-4111-8111-111111111102', '99999999-9999-4999-8999-999999990201', '99999999-9999-4999-8999-999999993201', '99999999-9999-4999-8999-999999996201', NULL, true, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_session_enrolments (
  id,
  institution_id,
  session_id,
  student_profile_id,
  grade_level_id,
  section_id,
  stream_id,
  roll_number,
  status
)
VALUES
  ('99999999-9999-4999-8999-999999998101', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '88888888-8888-4888-8888-888888880101', '99999999-9999-4999-8999-999999993101', '99999999-9999-4999-8999-999999994101', '99999999-9999-4999-8999-999999995101', '01', 'active'),
  ('99999999-9999-4999-8999-999999998102', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '88888888-8888-4888-8888-888888880102', '99999999-9999-4999-8999-999999993101', '99999999-9999-4999-8999-999999994101', '99999999-9999-4999-8999-999999995101', '02', 'active'),
  ('99999999-9999-4999-8999-999999998103', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '88888888-8888-4888-8888-888888880103', '99999999-9999-4999-8999-999999993101', '99999999-9999-4999-8999-999999994102', '99999999-9999-4999-8999-999999995102', '01', 'active'),
  ('99999999-9999-4999-8999-999999998104', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '88888888-8888-4888-8888-888888880104', '99999999-9999-4999-8999-999999993101', '99999999-9999-4999-8999-999999994102', '99999999-9999-4999-8999-999999995102', '02', 'active'),
  ('99999999-9999-4999-8999-999999998201', '11111111-1111-4111-8111-111111111102', '99999999-9999-4999-8999-999999990201', '88888888-8888-4888-8888-888888880201', '99999999-9999-4999-8999-999999993201', '99999999-9999-4999-8999-999999994201', '99999999-9999-4999-8999-999999995201', '01', 'active')
ON CONFLICT (id) DO NOTHING;

-- Mixed CBSE elective combinations per student
INSERT INTO public.student_subject_enrolments (institution_id, session_id, student_enrolment_id, subject_offering_id, enrolment_kind)
VALUES
  -- Aarav Verma (XI-A, Science + Applied Math)
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998101', '99999999-9999-4999-8999-999999997101', 'core'),
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998101', '99999999-9999-4999-8999-999999997102', 'core'),
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998101', '99999999-9999-4999-8999-999999997104', 'elective'),
  -- Diya Nair (XI-A, Science + Computer Science)
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998102', '99999999-9999-4999-8999-999999997101', 'core'),
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998102', '99999999-9999-4999-8999-999999997102', 'core'),
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998102', '99999999-9999-4999-8999-999999997105', 'elective'),
  -- Rohan Sen (XI-B, Commerce + Applied Math)
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998103', '99999999-9999-4999-8999-999999997101', 'core'),
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998103', '99999999-9999-4999-8999-999999997103', 'core'),
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998103', '99999999-9999-4999-8999-999999997104', 'elective'),
  -- Meera Das (XI-B, Commerce + Computer Science)
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998104', '99999999-9999-4999-8999-999999997101', 'core'),
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998104', '99999999-9999-4999-8999-999999997103', 'core'),
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999998104', '99999999-9999-4999-8999-999999997105', 'elective'),
  -- Kabir Rao (Valley XI-A)
  ('11111111-1111-4111-8111-111111111102', '99999999-9999-4999-8999-999999990201', '99999999-9999-4999-8999-999999998201', '99999999-9999-4999-8999-999999997201', 'core')
ON CONFLICT (institution_id, student_enrolment_id, subject_offering_id) DO NOTHING;

INSERT INTO public.teaching_groups (id, institution_id, session_id, subject_offering_id, code, name, is_cross_section, venue_label)
VALUES
  ('99999999-9999-4999-8999-999999999101', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999997104', 'TG-XI-APPMATH-1', 'Class XI Applied Mathematics (Cross-Section)', true, 'Math Seminar Room'),
  ('99999999-9999-4999-8999-999999999102', '11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999990101', '99999999-9999-4999-8999-999999997105', 'TG-XI-CS-1', 'Class XI Computer Science (Cross-Section)', true, 'Computer Lab 1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.teaching_group_memberships (institution_id, teaching_group_id, student_enrolment_id, status)
VALUES
  -- TG-XI-APPMATH-1: Aarav (XI-A) + Rohan (XI-B)
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999999101', '99999999-9999-4999-8999-999999998101', 'active'),
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999999101', '99999999-9999-4999-8999-999999998103', 'active'),
  -- TG-XI-CS-1: Diya (XI-A) + Meera (XI-B)
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999999102', '99999999-9999-4999-8999-999999998102', 'active'),
  ('11111111-1111-4111-8111-111111111101', '99999999-9999-4999-8999-999999999102', '99999999-9999-4999-8999-999999998104', 'active')
ON CONFLICT (institution_id, teaching_group_id, student_enrolment_id) DO NOTHING;

INSERT INTO public.academic_assignments (
  id,
  institution_id,
  session_id,
  person_id,
  assignment_type,
  department_id,
  section_id,
  teaching_group_id,
  starts_on,
  ends_on,
  status,
  assigned_by_person_id
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0101',
    '11111111-1111-4111-8111-111111111101',
    '99999999-9999-4999-8999-999999990101',
    '33333333-3333-4333-8333-333333333305',
    'hod',
    '99999999-9999-4999-8999-999999992101',
    NULL,
    NULL,
    '2026-04-01',
    '2027-03-31',
    'active',
    '33333333-3333-4333-8333-333333333301'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0102',
    '11111111-1111-4111-8111-111111111101',
    '99999999-9999-4999-8999-999999990101',
    '33333333-3333-4333-8333-333333333306',
    'class_teacher',
    NULL,
    '99999999-9999-4999-8999-999999994101',
    NULL,
    '2026-04-01',
    '2027-03-31',
    'active',
    '33333333-3333-4333-8333-333333333301'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0103',
    '11111111-1111-4111-8111-111111111101',
    '99999999-9999-4999-8999-999999990101',
    '33333333-3333-4333-8333-333333333302',
    'subject_teacher',
    NULL,
    NULL,
    '99999999-9999-4999-8999-999999999101',
    '2026-04-01',
    '2027-03-31',
    'active',
    '33333333-3333-4333-8333-333333333301'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0104',
    '11111111-1111-4111-8111-111111111101',
    '99999999-9999-4999-8999-999999990101',
    '33333333-3333-4333-8333-333333333307',
    'monitor',
    NULL,
    '99999999-9999-4999-8999-999999994101',
    NULL,
    '2026-04-01',
    '2027-03-31',
    'active',
    '33333333-3333-4333-8333-333333333306'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.custom_field_definitions (
  id,
  institution_id,
  entity_type,
  field_key,
  label,
  field_group,
  data_type,
  sensitivity_level
)
VALUES
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0101',
    '11111111-1111-4111-8111-111111111101',
    'student',
    'house_name',
    'House Name',
    'co_curricular',
    'text',
    'standard'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0102',
    '11111111-1111-4111-8111-111111111101',
    'student',
    'counseling_note',
    'Pastoral Counseling Note',
    'pastoral',
    'text',
    'confidential'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.custom_field_values (
  id,
  institution_id,
  definition_id,
  entity_type,
  entity_id,
  value_text,
  updated_by_person_id
)
VALUES
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb1101',
    '11111111-1111-4111-8111-111111111101',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0101',
    'student',
    '88888888-8888-4888-8888-888888880101',
    'Tagore House',
    '33333333-3333-4333-8333-333333333301'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb1102',
    '11111111-1111-4111-8111-111111111101',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0102',
    'student',
    '88888888-8888-4888-8888-888888880101',
    'Synthetic confidential counseling observation for RLS testing',
    '33333333-3333-4333-8333-333333333301'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.audit_events (
  id,
  institution_id,
  actor_person_id,
  actor_auth_user_id,
  action,
  entity_type,
  entity_id,
  reason,
  after_state
)
VALUES
  (
    '77777777-7777-4777-8777-777777777701',
    '11111111-1111-4111-8111-111111111101',
    '33333333-3333-4333-8333-333333333301',
    '22222222-2222-4222-8222-222222222201',
    'institution.seeded',
    'institutions',
    '11111111-1111-4111-8111-111111111101',
    'Synthetic development seed for Sunrise CBSE',
    '{"slug":"sunrise-cbse"}'::jsonb
  ),
  (
    '77777777-7777-4777-8777-777777777702',
    '11111111-1111-4111-8111-111111111102',
    '33333333-3333-4333-8333-333333333303',
    '22222222-2222-4222-8222-222222222203',
    'institution.seeded',
    'institutions',
    '11111111-1111-4111-8111-111111111102',
    'Synthetic development seed for Valley CBSE',
    '{"slug":"valley-cbse"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Phase 3 synthetic seed: Attendance policies, verified/draft attendance +
-- append-only events, staff attendance, student leave, parent notice, and
-- category-partitioned Digital Student Handbook entries.
INSERT INTO public.attendance_policies (
  id,
  institution_id,
  minimum_attendance_percent,
  warning_threshold_percent,
  period_attendance_enabled,
  biometric_enabled,
  policy_notes
)
VALUES
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc0101',
    '11111111-1111-4111-8111-111111111101',
    75.00,
    80.00,
    false,
    false,
    'Configurable institutional baseline (biometric disabled by default)'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc0201',
    '11111111-1111-4111-8111-111111111102',
    75.00,
    80.00,
    false,
    false,
    'Valley CBSE configurable attendance policy baseline'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.attendance_events (
  id,
  institution_id,
  idempotency_key,
  subject_kind,
  student_profile_id,
  staff_profile_id,
  session_id,
  section_id,
  attendance_date,
  event_type,
  attendance_status,
  source,
  recorded_by_person_id
)
VALUES
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc1101',
    '11111111-1111-4111-8111-111111111101',
    'seed-sr-2026-11-27-aarav',
    'student',
    '88888888-8888-4888-8888-888888880101',
    NULL,
    '99999999-9999-4999-8999-999999990101',
    '99999999-9999-4999-8999-999999994101',
    '2026-11-27',
    'day_roll',
    'present',
    'manual',
    '33333333-3333-4333-8333-333333333306'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc1102',
    '11111111-1111-4111-8111-111111111101',
    'seed-sr-2026-11-27-diya',
    'student',
    '88888888-8888-4888-8888-888888880102',
    NULL,
    '99999999-9999-4999-8999-999999990101',
    '99999999-9999-4999-8999-999999994101',
    '2026-11-27',
    'day_roll',
    'present',
    'manual',
    '33333333-3333-4333-8333-333333333306'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc1103',
    '11111111-1111-4111-8111-111111111101',
    'seed-sr-2026-11-27-rohan',
    'student',
    '88888888-8888-4888-8888-888888880103',
    NULL,
    '99999999-9999-4999-8999-999999990101',
    '99999999-9999-4999-8999-999999994102',
    '2026-11-27',
    'day_roll',
    'absent',
    'manual',
    '33333333-3333-4333-8333-333333333305'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc1104',
    '11111111-1111-4111-8111-111111111101',
    'seed-sr-2026-11-27-emp001',
    'staff',
    NULL,
    '88888888-8888-4888-8888-888888881101',
    NULL,
    NULL,
    '2026-11-27',
    'staff_check_in',
    'present',
    'manual',
    '33333333-3333-4333-8333-333333333301'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_daily_attendance (
  id,
  institution_id,
  session_id,
  student_enrolment_id,
  student_profile_id,
  section_id,
  attendance_date,
  status,
  verification_status,
  marked_by_person_id,
  verified_by_person_id,
  verified_at,
  signed_off_by_person_id,
  signed_off_at
)
VALUES
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc2101',
    '11111111-1111-4111-8111-111111111101',
    '99999999-9999-4999-8999-999999990101',
    '99999999-9999-4999-8999-999999998101',
    '88888888-8888-4888-8888-888888880101',
    '99999999-9999-4999-8999-999999994101',
    '2026-11-27',
    'present',
    'class_teacher_verified',
    '33333333-3333-4333-8333-333333333306',
    '33333333-3333-4333-8333-333333333306',
    now(),
    NULL,
    NULL
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc2102',
    '11111111-1111-4111-8111-111111111101',
    '99999999-9999-4999-8999-999999990101',
    '99999999-9999-4999-8999-999999998102',
    '88888888-8888-4888-8888-888888880102',
    '99999999-9999-4999-8999-999999994101',
    '2026-11-27',
    'present',
    'signed_off',
    '33333333-3333-4333-8333-333333333306',
    '33333333-3333-4333-8333-333333333306',
    now(),
    '33333333-3333-4333-8333-333333333301',
    now()
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc2103',
    '11111111-1111-4111-8111-111111111101',
    '99999999-9999-4999-8999-999999990101',
    '99999999-9999-4999-8999-999999998103',
    '88888888-8888-4888-8888-888888880103',
    '99999999-9999-4999-8999-999999994102',
    '2026-11-27',
    'absent',
    'draft',
    '33333333-3333-4333-8333-333333333305',
    NULL,
    NULL,
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.staff_daily_attendance (
  id,
  institution_id,
  staff_profile_id,
  attendance_date,
  status,
  verification_status,
  marked_by_person_id
)
VALUES
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc3101',
    '11111111-1111-4111-8111-111111111101',
    '88888888-8888-4888-8888-888888881101',
    '2026-11-27',
    'present',
    'verified',
    '33333333-3333-4333-8333-333333333301'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leave_applications (
  id,
  institution_id,
  applicant_kind,
  session_id,
  student_profile_id,
  staff_profile_id,
  starts_on,
  ends_on,
  leave_type,
  reason,
  status,
  submitted_by_person_id
)
VALUES
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc4101',
    '11111111-1111-4111-8111-111111111101',
    'student',
    '99999999-9999-4999-8999-999999990101',
    '88888888-8888-4888-8888-888888880101',
    NULL,
    '2026-12-02',
    '2026-12-03',
    'family',
    'Synthetic family travel leave request',
    'submitted',
    '33333333-3333-4333-8333-333333333301'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.parent_attendance_notices (
  id,
  institution_id,
  student_profile_id,
  guardian_person_id,
  attendance_date,
  notice_kind,
  message,
  status
)
VALUES
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc5101',
    '11111111-1111-4111-8111-111111111102',
    '88888888-8888-4888-8888-888888880201',
    '33333333-3333-4333-8333-333333333302',
    '2026-11-28',
    'late_arrival',
    'Synthetic medical appointment delay notice from linked guardian',
    'submitted'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.handbook_entries (
  id,
  institution_id,
  session_id,
  student_profile_id,
  category,
  visibility_scope,
  teaching_group_id,
  title,
  body,
  authored_by_person_id
)
VALUES
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc6101',
    '11111111-1111-4111-8111-111111111101',
    '99999999-9999-4999-8999-999999990101',
    '88888888-8888-4888-8888-888888880101',
    'academic_observation',
    'student_and_guardian',
    '99999999-9999-4999-8999-999999999101',
    'Strong Applied Math Problem Solving',
    'Demonstrated clear analytical steps during TG-XI-APPMATH-1 seminar.',
    '33333333-3333-4333-8333-333333333302'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc6102',
    '11111111-1111-4111-8111-111111111101',
    '99999999-9999-4999-8999-999999990101',
    '88888888-8888-4888-8888-888888880101',
    'student_support',
    'class_teacher_and_leadership',
    NULL,
    'Class Teacher & Leadership Check-In',
    'Synthetic wellbeing follow-up restricted to Class Teacher XI-A, HOD, and leadership.',
    '33333333-3333-4333-8333-333333333306'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccc6103',
    '11111111-1111-4111-8111-111111111101',
    '99999999-9999-4999-8999-999999990101',
    '88888888-8888-4888-8888-888888880101',
    'disciplinary',
    'leadership_only',
    NULL,
    'Leadership Confidential Conduct Record',
    'Synthetic leadership-only disciplinary entry hidden from teachers, monitors, students, and guardians.',
    '33333333-3333-4333-8333-333333333301'
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
