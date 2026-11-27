-- P2-M01 Migration 4: People registry (student, staff, guardian, admissions)
-- and sensitivity-scoped custom field tables with composite tenant FKs.

CREATE TABLE public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  membership_id uuid,
  admission_number text NOT NULL,
  admission_date date,
  lifecycle_status text NOT NULL DEFAULT 'active' CHECK (
    lifecycle_status IN (
      'applicant',
      'admitted',
      'active',
      'promoted',
      'retained',
      'graduated',
      'withdrawn',
      'transferred'
    )
  ),
  date_of_birth date,
  gender text,
  blood_group text,
  address_line text,
  emergency_contact_name text,
  emergency_contact_phone text,
  pen_number text,
  apaar_id text,
  external_id_verification_status text NOT NULL DEFAULT 'unverified' CHECK (
    external_id_verification_status IN ('unverified', 'pending', 'verified', 'rejected')
  ),
  external_id_verified_at timestamptz,
  external_id_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, person_id),
  UNIQUE (institution_id, admission_number),
  FOREIGN KEY (institution_id, membership_id)
    REFERENCES public.institution_memberships(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  membership_id uuid,
  employee_code text NOT NULL,
  designation text NOT NULL,
  employment_type text NOT NULL DEFAULT 'full_time' CHECK (
    employment_type IN ('full_time', 'part_time', 'contract', 'visiting', 'support')
  ),
  lifecycle_status text NOT NULL DEFAULT 'active' CHECK (
    lifecycle_status IN ('applicant', 'active', 'on_leave', 'transferred', 'relieved', 'retired')
  ),
  joining_date date,
  relieving_date date,
  qualifications text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, person_id),
  UNIQUE (institution_id, employee_code),
  FOREIGN KEY (institution_id, membership_id)
    REFERENCES public.institution_memberships(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.student_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  student_profile_id uuid NOT NULL,
  guardian_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  relationship text NOT NULL CHECK (
    relationship IN ('mother', 'father', 'legal_guardian', 'other')
  ),
  is_primary boolean NOT NULL DEFAULT false,
  can_view_academics boolean NOT NULL DEFAULT true,
  can_receive_notices boolean NOT NULL DEFAULT true,
  can_pickup boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, student_profile_id, guardian_person_id),
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.admission_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  applicant_full_name text NOT NULL,
  applicant_email text,
  guardian_full_name text,
  guardian_phone text,
  target_session_label text NOT NULL,
  target_grade_code text NOT NULL,
  status text NOT NULL DEFAULT 'enquiry' CHECK (
    status IN (
      'enquiry',
      'submitted',
      'under_review',
      'approved',
      'waitlisted',
      'rejected',
      'withdrawn',
      'enrolled'
    )
  ),
  reviewed_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  admitted_student_profile_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, admitted_student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  entity_type text NOT NULL CHECK (
    entity_type IN ('student', 'staff', 'guardian', 'admission')
  ),
  field_key text NOT NULL CHECK (field_key ~ '^[a-z][a-z0-9_]{1,49}$'),
  label text NOT NULL,
  field_group text NOT NULL DEFAULT 'general',
  data_type text NOT NULL CHECK (
    data_type IN ('text', 'number', 'date', 'boolean', 'select')
  ),
  options_json jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(options_json) = 'array'),
  is_required boolean NOT NULL DEFAULT false,
  sensitivity_level text NOT NULL DEFAULT 'standard' CHECK (
    sensitivity_level IN ('standard', 'restricted', 'confidential')
  ),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, entity_type, field_key)
);

CREATE TABLE public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  definition_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (
    entity_type IN ('student', 'staff', 'guardian', 'admission')
  ),
  entity_id uuid NOT NULL,
  value_text text,
  value_json jsonb,
  updated_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, definition_id, entity_id),
  FOREIGN KEY (institution_id, definition_id)
    REFERENCES public.custom_field_definitions(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TRIGGER trg_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_staff_profiles_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_student_guardians_updated_at
  BEFORE UPDATE ON public.student_guardians
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_admission_applications_updated_at
  BEFORE UPDATE ON public.admission_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_custom_field_definitions_updated_at
  BEFORE UPDATE ON public.custom_field_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_custom_field_values_updated_at
  BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- B-tree indexes on tenant FK & RLS filter columns
CREATE INDEX idx_student_profiles_institution_person
  ON public.student_profiles (institution_id, person_id);

CREATE INDEX idx_student_profiles_institution_status
  ON public.student_profiles (institution_id, lifecycle_status);

CREATE INDEX idx_staff_profiles_institution_person
  ON public.staff_profiles (institution_id, person_id);

CREATE INDEX idx_student_guardians_institution_student_status
  ON public.student_guardians (institution_id, student_profile_id, status);

CREATE INDEX idx_student_guardians_institution_guardian_status
  ON public.student_guardians (institution_id, guardian_person_id, status);

CREATE INDEX idx_admission_applications_institution_status
  ON public.admission_applications (institution_id, status);

CREATE INDEX idx_custom_field_definitions_institution_entity_sensitivity
  ON public.custom_field_definitions (institution_id, entity_type, sensitivity_level);

CREATE INDEX idx_custom_field_values_institution_entity
  ON public.custom_field_values (institution_id, entity_type, entity_id);

CREATE INDEX idx_custom_field_values_institution_definition
  ON public.custom_field_values (institution_id, definition_id);
