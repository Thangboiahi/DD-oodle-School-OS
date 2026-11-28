-- P5-M01 Migration 18: Phase 5 Configurable Assessment Schemes, Examination Cycles,
-- Exam Schedules, Marks Entries, and Immutable Append-Only Result Snapshots.

-- 1. Configurable Versioned Assessment Schemes (zero hardcoded board compliance claims)
CREATE TABLE public.assessment_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  board_code text NOT NULL DEFAULT 'INSTITUTION_CUSTOM',
  scheme_version text NOT NULL DEFAULT '1.0',
  source_reference text,
  compliance_verified_at timestamptz,
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  grading_scale jsonb NOT NULL DEFAULT '[]'::jsonb,
  pass_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, code, scheme_version)
);

-- 2. Examination Cycles
CREATE TABLE public.exam_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  term_id uuid,
  assessment_scheme_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL CHECK (ends_on >= starts_on),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'scheduled', 'marks_open', 'moderation', 'approved', 'published', 'archived')
  ),
  published_at timestamptz,
  published_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  authored_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, session_id, code),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, term_id)
    REFERENCES public.academic_terms(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, assessment_scheme_id)
    REFERENCES public.assessment_schemes(institution_id, id)
    ON DELETE RESTRICT
);

-- 3. Examination Subject Schedules
CREATE TABLE public.exam_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  exam_cycle_id uuid NOT NULL,
  subject_offering_id uuid NOT NULL,
  teaching_group_id uuid,
  exam_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  venue_id uuid,
  max_marks numeric(6,2) NOT NULL CHECK (max_marks > 0),
  pass_marks numeric(6,2) NOT NULL CHECK (pass_marks >= 0 AND pass_marks <= max_marks),
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, exam_cycle_id)
    REFERENCES public.exam_cycles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, subject_offering_id)
    REFERENCES public.subject_offerings(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, teaching_group_id)
    REFERENCES public.teaching_groups(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, venue_id)
    REFERENCES public.venues(institution_id, id)
    ON DELETE RESTRICT
);

-- 4. Raw Exam Marks Entries (strictly hidden from students, guardians, and monitors via RLS)
CREATE TABLE public.exam_marks_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  exam_cycle_id uuid NOT NULL,
  exam_schedule_id uuid NOT NULL,
  student_enrolment_id uuid NOT NULL,
  student_profile_id uuid NOT NULL,
  component_marks jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_marks numeric(6,2) CHECK (total_marks IS NULL OR total_marks >= 0),
  attendance_flag text NOT NULL DEFAULT 'present' CHECK (
    attendance_flag IN ('present', 'absent', 'exempt')
  ),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'moderated', 'approved', 'published')
  ),
  remarks text,
  entered_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  moderated_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  approved_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, exam_schedule_id, student_enrolment_id),
  FOREIGN KEY (institution_id, exam_cycle_id)
    REFERENCES public.exam_cycles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, exam_schedule_id)
    REFERENCES public.exam_schedules(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_enrolment_id)
    REFERENCES public.student_session_enrolments(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT
);

-- 5. Immutable Append-Only Published Result Snapshots
CREATE TABLE public.result_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  exam_cycle_id uuid NOT NULL,
  student_enrolment_id uuid NOT NULL,
  student_profile_id uuid NOT NULL,
  revision_no integer NOT NULL DEFAULT 1 CHECK (revision_no >= 1),
  supersedes_snapshot_id uuid,
  reissue_reason text,
  snapshot_payload jsonb NOT NULL,
  overall_percentage numeric(5,2) CHECK (
    overall_percentage IS NULL OR (overall_percentage >= 0 AND overall_percentage <= 100)
  ),
  overall_grade text,
  result_status text NOT NULL CHECK (
    result_status IN ('pass', 'compartment', 'fail', 'withheld')
  ),
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    revision_no = 1
    OR (
      supersedes_snapshot_id IS NOT NULL
      AND nullif(trim(coalesce(reissue_reason, '')), '') IS NOT NULL
    )
  ),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, exam_cycle_id, student_enrolment_id, revision_no),
  FOREIGN KEY (institution_id, exam_cycle_id)
    REFERENCES public.exam_cycles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_enrolment_id)
    REFERENCES public.student_session_enrolments(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, supersedes_snapshot_id)
    REFERENCES public.result_snapshots(institution_id, id)
    ON DELETE RESTRICT
);

-- Mutable-Table Updated_at Triggers
CREATE TRIGGER trg_assessment_schemes_updated_at
  BEFORE UPDATE ON public.assessment_schemes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_exam_cycles_updated_at
  BEFORE UPDATE ON public.exam_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_exam_schedules_updated_at
  BEFORE UPDATE ON public.exam_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_exam_marks_entries_updated_at
  BEFORE UPDATE ON public.exam_marks_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Statement-Level Append-Only Immutability Trigger on public.result_snapshots (SQLSTATE 42501)
CREATE OR REPLACE FUNCTION public.prevent_result_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'public.result_snapshots is immutable append-only; publish a revision_no + 1 reissue snapshot with reason instead of UPDATE/DELETE'
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_result_snapshots_immutable
  BEFORE UPDATE OR DELETE ON public.result_snapshots
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.prevent_result_snapshot_mutation();

-- B-tree Indexes on FK, RLS, and Filter Columns
CREATE INDEX idx_assessment_schemes_institution_active
  ON public.assessment_schemes (institution_id, is_active);

CREATE INDEX idx_exam_cycles_institution_session_status
  ON public.exam_cycles (institution_id, session_id, status);

CREATE INDEX idx_exam_cycles_institution_scheme
  ON public.exam_cycles (institution_id, assessment_scheme_id);

CREATE INDEX idx_exam_schedules_institution_cycle_date
  ON public.exam_schedules (institution_id, exam_cycle_id, exam_date);

CREATE INDEX idx_exam_schedules_institution_offering_group
  ON public.exam_schedules (institution_id, subject_offering_id, teaching_group_id);

CREATE INDEX idx_exam_marks_entries_institution_schedule_status
  ON public.exam_marks_entries (institution_id, exam_schedule_id, status);

CREATE INDEX idx_exam_marks_entries_institution_cycle_student
  ON public.exam_marks_entries (institution_id, exam_cycle_id, student_profile_id);

CREATE INDEX idx_result_snapshots_institution_cycle_student
  ON public.result_snapshots (institution_id, exam_cycle_id, student_profile_id, revision_no DESC);

CREATE INDEX idx_result_snapshots_institution_student
  ON public.result_snapshots (institution_id, student_profile_id, published_at DESC);
