-- 100% synthetic two-institution development & RLS verification seed.
-- Zero real student, parent, staff, or institutional PII.

BEGIN;

SET LOCAL search_path = public, extensions;

-- Deterministic synthetic institution UUIDs
-- sunrise-cbse: 11111111-1111-4111-8111-111111111101
-- valley-cbse:  11111111-1111-4111-8111-111111111102

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
    crypt('SyntheticDevOnly!1', gen_salt('bf')),
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
    crypt('SyntheticDevOnly!2', gen_salt('bf')),
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
    crypt('SyntheticDevOnly!3', gen_salt('bf')),
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
    crypt('SyntheticDevOnly!4', gen_salt('bf')),
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
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.institution_roles (id, institution_id, code, name, description, is_system, is_active, permissions)
VALUES
  -- Sunrise CBSE roles
  ('55555555-5555-4555-8555-555555555101', '11111111-1111-4111-8111-111111111101', 'principal', 'Principal', 'Full institutional governance', true, true, '["institution.*"]'::jsonb),
  ('55555555-5555-4555-8555-555555555102', '11111111-1111-4111-8111-111111111101', 'vice_principal', 'Vice Principal', 'Academic and operations leadership', true, true, '["people.read","memberships.read","roles.read","audit.read","files.write"]'::jsonb),
  ('55555555-5555-4555-8555-555555555103', '11111111-1111-4111-8111-111111111101', 'hod', 'Head of Department', 'Department academic coordination', true, true, '["people.read","academics.manage"]'::jsonb),
  ('55555555-5555-4555-8555-555555555104', '11111111-1111-4111-8111-111111111101', 'class_teacher', 'Class Teacher', 'Section coordination and attendance', true, true, '["people.read","section.coordinate"]'::jsonb),
  ('55555555-5555-4555-8555-555555555105', '11111111-1111-4111-8111-111111111101', 'subject_teacher', 'Subject Teacher', 'Teaching group instruction and assessments', true, true, '["academics.teach"]'::jsonb),
  ('55555555-5555-4555-8555-555555555106', '11111111-1111-4111-8111-111111111101', 'parent_guardian', 'Parent / Guardian', 'Ward records and guardian communications', true, true, '["ward.read"]'::jsonb),
  ('55555555-5555-4555-8555-555555555107', '11111111-1111-4111-8111-111111111101', 'student', 'Student', 'Student handbook, timetable and coursework', true, true, '["self.read"]'::jsonb),
  ('55555555-5555-4555-8555-555555555108', '11111111-1111-4111-8111-111111111101', 'monitor', 'Class Monitor / Monitress', 'Read-only classroom summary coordination', true, true, '["classroom.summary.read"]'::jsonb),

  -- Valley CBSE roles
  ('55555555-5555-4555-8555-555555555201', '11111111-1111-4111-8111-111111111102', 'principal', 'Principal', 'Full institutional governance', true, true, '["institution.*"]'::jsonb),
  ('55555555-5555-4555-8555-555555555202', '11111111-1111-4111-8111-111111111102', 'vice_principal', 'Vice Principal', 'Academic and operations leadership', true, true, '["people.read","memberships.read","roles.read","audit.read","files.write"]'::jsonb),
  ('55555555-5555-4555-8555-555555555203', '11111111-1111-4111-8111-111111111102', 'hod', 'Head of Department', 'Department academic coordination', true, true, '["people.read","academics.manage"]'::jsonb),
  ('55555555-5555-4555-8555-555555555204', '11111111-1111-4111-8111-111111111102', 'class_teacher', 'Class Teacher', 'Section coordination and attendance', true, true, '["people.read","section.coordinate"]'::jsonb),
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

COMMIT;
