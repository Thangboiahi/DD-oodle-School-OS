-- P2-M01 Migration 5: Academic structure, mixed-elective enrolments,
-- cross-section teaching groups, and typed time-bound academic assignments.

CREATE TABLE public.academic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on > starts_on),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, code)
);

CREATE UNIQUE INDEX uq_academic_sessions_one_active
  ON public.academic_sessions (institution_id)
  WHERE status = 'active';

CREATE TABLE public.academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on > starts_on),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, session_id, code),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.academic_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  department_kind text NOT NULL CHECK (
    department_kind IN ('class_band', 'subject_group', 'functional')
  ),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, code)
);

CREATE TABLE public.grade_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  department_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, code),
  FOREIGN KEY (institution_id, department_id)
    REFERENCES public.academic_departments(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  grade_level_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  room_label text,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, session_id, grade_level_id, code),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, grade_level_id)
    REFERENCES public.grade_levels(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, code)
);

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  board_subject_code text,
  category text NOT NULL CHECK (
    category IN ('core', 'elective', 'language', 'additional', 'co_scholastic')
  ),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, code)
);

CREATE TABLE public.subject_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  grade_level_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  stream_id uuid,
  is_mandatory boolean NOT NULL DEFAULT false,
  max_students integer CHECK (max_students IS NULL OR max_students > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, grade_level_id)
    REFERENCES public.grade_levels(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, subject_id)
    REFERENCES public.subjects(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, stream_id)
    REFERENCES public.streams(institution_id, id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_subject_offerings_combo
  ON public.subject_offerings (
    institution_id,
    session_id,
    grade_level_id,
    subject_id,
    COALESCE(stream_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE TABLE public.student_session_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  student_profile_id uuid NOT NULL,
  grade_level_id uuid NOT NULL,
  section_id uuid NOT NULL,
  stream_id uuid,
  roll_number text,
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'promoted', 'retained', 'graduated', 'withdrawn', 'transferred')
  ),
  enrolled_on date NOT NULL DEFAULT CURRENT_DATE,
  exited_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, session_id, student_profile_id),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, grade_level_id)
    REFERENCES public.grade_levels(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, section_id)
    REFERENCES public.sections(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, stream_id)
    REFERENCES public.streams(institution_id, id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_student_session_enrolments_roll
  ON public.student_session_enrolments (institution_id, session_id, section_id, roll_number)
  WHERE roll_number IS NOT NULL;

CREATE TABLE public.student_subject_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  student_enrolment_id uuid NOT NULL,
  subject_offering_id uuid NOT NULL,
  enrolment_kind text NOT NULL CHECK (enrolment_kind IN ('core', 'elective', 'additional')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, student_enrolment_id, subject_offering_id),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_enrolment_id)
    REFERENCES public.student_session_enrolments(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, subject_offering_id)
    REFERENCES public.subject_offerings(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.teaching_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  subject_offering_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  is_cross_section boolean NOT NULL DEFAULT false,
  venue_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, session_id, code),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, subject_offering_id)
    REFERENCES public.subject_offerings(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.teaching_group_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  teaching_group_id uuid NOT NULL,
  student_enrolment_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  joined_on date NOT NULL DEFAULT CURRENT_DATE,
  left_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, teaching_group_id, student_enrolment_id),
  FOREIGN KEY (institution_id, teaching_group_id)
    REFERENCES public.teaching_groups(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_enrolment_id)
    REFERENCES public.student_session_enrolments(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.academic_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  assignment_type text NOT NULL CHECK (
    assignment_type IN ('hod', 'class_teacher', 'subject_teacher', 'monitor', 'monitress')
  ),
  department_id uuid,
  section_id uuid,
  teaching_group_id uuid,
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  ends_on date,
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'delegated', 'completed', 'revoked')
  ),
  assigned_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on IS NULL OR ends_on >= starts_on),
  CHECK (
    (
      assignment_type = 'hod'
      AND department_id IS NOT NULL
      AND section_id IS NULL
      AND teaching_group_id IS NULL
    )
    OR (
      assignment_type IN ('class_teacher', 'monitor', 'monitress')
      AND section_id IS NOT NULL
      AND department_id IS NULL
      AND teaching_group_id IS NULL
    )
    OR (
      assignment_type = 'subject_teacher'
      AND teaching_group_id IS NOT NULL
      AND department_id IS NULL
      AND section_id IS NULL
    )
  ),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, department_id)
    REFERENCES public.academic_departments(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, section_id)
    REFERENCES public.sections(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, teaching_group_id)
    REFERENCES public.teaching_groups(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TRIGGER trg_academic_sessions_updated_at
  BEFORE UPDATE ON public.academic_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_academic_terms_updated_at
  BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_academic_departments_updated_at
  BEFORE UPDATE ON public.academic_departments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_grade_levels_updated_at
  BEFORE UPDATE ON public.grade_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_sections_updated_at
  BEFORE UPDATE ON public.sections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_streams_updated_at
  BEFORE UPDATE ON public.streams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_subject_offerings_updated_at
  BEFORE UPDATE ON public.subject_offerings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_student_session_enrolments_updated_at
  BEFORE UPDATE ON public.student_session_enrolments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_student_subject_enrolments_updated_at
  BEFORE UPDATE ON public.student_subject_enrolments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_teaching_groups_updated_at
  BEFORE UPDATE ON public.teaching_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_teaching_group_memberships_updated_at
  BEFORE UPDATE ON public.teaching_group_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_academic_assignments_updated_at
  BEFORE UPDATE ON public.academic_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- B-tree indexes on FK and RLS predicate columns
CREATE INDEX idx_academic_terms_institution_session
  ON public.academic_terms (institution_id, session_id);

CREATE INDEX idx_grade_levels_institution_department
  ON public.grade_levels (institution_id, department_id);

CREATE INDEX idx_sections_institution_session_grade
  ON public.sections (institution_id, session_id, grade_level_id);

CREATE INDEX idx_subject_offerings_institution_session_grade
  ON public.subject_offerings (institution_id, session_id, grade_level_id);

CREATE INDEX idx_student_session_enrolments_institution_student_status
  ON public.student_session_enrolments (institution_id, student_profile_id, status);

CREATE INDEX idx_student_session_enrolments_institution_section_status
  ON public.student_session_enrolments (institution_id, session_id, section_id, status);

CREATE INDEX idx_student_subject_enrolments_institution_enrolment
  ON public.student_subject_enrolments (institution_id, student_enrolment_id);

CREATE INDEX idx_teaching_groups_institution_session_offering
  ON public.teaching_groups (institution_id, session_id, subject_offering_id);

CREATE INDEX idx_teaching_group_memberships_institution_group_status
  ON public.teaching_group_memberships (institution_id, teaching_group_id, status);

CREATE INDEX idx_teaching_group_memberships_institution_enrolment_status
  ON public.teaching_group_memberships (institution_id, student_enrolment_id, status);

CREATE INDEX idx_academic_assignments_institution_person_status
  ON public.academic_assignments (institution_id, person_id, status, assignment_type);

CREATE INDEX idx_academic_assignments_institution_targets
  ON public.academic_assignments (institution_id, session_id, department_id, section_id, teaching_group_id);
