-- P4-M01 Migration 14: Phase 4 Academic Planning, Syllabus Progress,
-- Lesson Plans, Learning Resources, and Unified Hybrid Assignments Schema.

-- Extend existing public.academic_terms (created in Migration 5) with lifecycle status.
ALTER TABLE public.academic_terms
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned'
  CHECK (status IN ('planned', 'active', 'completed'));

-- 1. Normalized Syllabus Hierarchy (Unit -> Chapter -> Topic)
CREATE TABLE public.syllabus_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  term_id uuid,
  subject_offering_id uuid NOT NULL,
  parent_item_id uuid,
  item_kind text NOT NULL CHECK (item_kind IN ('unit', 'chapter', 'topic')),
  code text NOT NULL,
  title text NOT NULL,
  description text,
  sequence_no integer NOT NULL DEFAULT 1 CHECK (sequence_no > 0),
  target_date date,
  progress_status text NOT NULL DEFAULT 'not_started' CHECK (
    progress_status IN ('not_started', 'in_progress', 'completed', 'revised', 'delayed')
  ),
  delay_reason text,
  carry_forward_notes text,
  updated_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    progress_status <> 'delayed'
    OR nullif(trim(coalesce(delay_reason, '')), '') IS NOT NULL
  ),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, subject_offering_id, code),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, term_id)
    REFERENCES public.academic_terms(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, subject_offering_id)
    REFERENCES public.subject_offerings(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, parent_item_id)
    REFERENCES public.syllabus_items(institution_id, id)
    ON DELETE RESTRICT
);

-- 2. Teaching-Group Lesson Plans
CREATE TABLE public.lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  teaching_group_id uuid NOT NULL,
  syllabus_item_id uuid,
  planned_for_date date NOT NULL,
  week_label text,
  title text NOT NULL,
  learning_objectives text NOT NULL,
  teaching_notes text,
  status text NOT NULL DEFAULT 'planned' CHECK (
    status IN ('planned', 'delivered', 'revised', 'carried_forward')
  ),
  carry_forward_notes text,
  authored_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, teaching_group_id)
    REFERENCES public.teaching_groups(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, syllabus_item_id)
    REFERENCES public.syllabus_items(institution_id, id)
    ON DELETE RESTRICT
);

-- 3. Teaching & Subject Learning Resources
CREATE TABLE public.learning_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  subject_offering_id uuid NOT NULL,
  teaching_group_id uuid,
  syllabus_item_id uuid,
  title text NOT NULL,
  description text,
  resource_kind text NOT NULL CHECK (
    resource_kind IN ('link', 'document_ref', 'notes', 'worksheet')
  ),
  external_url text,
  storage_bucket text,
  storage_path text,
  visibility text NOT NULL DEFAULT 'teaching_group' CHECK (
    visibility IN ('teaching_group', 'subject_offering', 'staff_only')
  ),
  status text NOT NULL DEFAULT 'published' CHECK (
    status IN ('draft', 'published', 'archived')
  ),
  authored_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (visibility <> 'teaching_group' OR teaching_group_id IS NOT NULL),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, subject_offering_id)
    REFERENCES public.subject_offerings(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, teaching_group_id)
    REFERENCES public.teaching_groups(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, syllabus_item_id)
    REFERENCES public.syllabus_items(institution_id, id)
    ON DELETE RESTRICT
);

-- 4. Unified Hybrid Assignments (Homework, Classwork, Quiz, Project, Practical)
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  teaching_group_id uuid NOT NULL,
  syllabus_item_id uuid,
  title text NOT NULL,
  instructions text NOT NULL,
  assignment_type text NOT NULL CHECK (
    assignment_type IN ('homework', 'classwork', 'quiz', 'project', 'practical')
  ),
  submission_mode text NOT NULL DEFAULT 'both' CHECK (
    submission_mode IN ('online', 'offline', 'both')
  ),
  evaluation_mode text NOT NULL DEFAULT 'manual' CHECK (
    evaluation_mode IN ('manual', 'auto_mcq', 'rubric')
  ),
  max_marks numeric(6,2) CHECK (max_marks IS NULL OR max_marks >= 0),
  issued_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  allow_late_submission boolean NOT NULL DEFAULT true,
  objective_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'closed', 'archived')
  ),
  authored_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, teaching_group_id)
    REFERENCES public.teaching_groups(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, syllabus_item_id)
    REFERENCES public.syllabus_items(institution_id, id)
    ON DELETE RESTRICT
);

-- 5. Unified Assignment Submissions (Online, MCQ & Offline Notebook Recording)
CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  assignment_id uuid NOT NULL,
  student_enrolment_id uuid NOT NULL,
  student_profile_id uuid NOT NULL,
  submission_channel text NOT NULL DEFAULT 'online' CHECK (
    submission_channel IN ('online', 'offline_recorded')
  ),
  status text NOT NULL DEFAULT 'assigned' CHECK (
    status IN (
      'assigned',
      'submitted',
      'late_submitted',
      'completed_offline',
      'evaluated',
      'resubmit_requested'
    )
  ),
  submitted_at timestamptz,
  response_text text,
  objective_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachment_storage_path text,
  marks_awarded numeric(6,2) CHECK (marks_awarded IS NULL OR marks_awarded >= 0),
  teacher_remarks text,
  submitted_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  evaluated_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, assignment_id, student_enrolment_id),
  FOREIGN KEY (institution_id, assignment_id)
    REFERENCES public.assignments(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_enrolment_id)
    REFERENCES public.student_session_enrolments(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT
);

-- updated_at triggers
CREATE TRIGGER trg_syllabus_items_updated_at
  BEFORE UPDATE ON public.syllabus_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_lesson_plans_updated_at
  BEFORE UPDATE ON public.lesson_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_learning_resources_updated_at
  BEFORE UPDATE ON public.learning_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_assignment_submissions_updated_at
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- B-tree indexes on FK, RLS predicate, and filter columns
CREATE INDEX idx_syllabus_items_institution_offering_seq
  ON public.syllabus_items (institution_id, subject_offering_id, sequence_no);

CREATE INDEX idx_syllabus_items_institution_session_status
  ON public.syllabus_items (institution_id, session_id, progress_status);

CREATE INDEX idx_syllabus_items_institution_parent
  ON public.syllabus_items (institution_id, parent_item_id);

CREATE INDEX idx_lesson_plans_institution_group_date
  ON public.lesson_plans (institution_id, teaching_group_id, planned_for_date DESC);

CREATE INDEX idx_lesson_plans_institution_syllabus
  ON public.lesson_plans (institution_id, syllabus_item_id);

CREATE INDEX idx_learning_resources_institution_offering_status
  ON public.learning_resources (institution_id, subject_offering_id, status);

CREATE INDEX idx_learning_resources_institution_group_status
  ON public.learning_resources (institution_id, teaching_group_id, status);

CREATE INDEX idx_assignments_institution_group_status_due
  ON public.assignments (institution_id, teaching_group_id, status, due_at);

CREATE INDEX idx_assignments_institution_syllabus
  ON public.assignments (institution_id, syllabus_item_id);

CREATE INDEX idx_assignment_submissions_institution_assignment_status
  ON public.assignment_submissions (institution_id, assignment_id, status);

CREATE INDEX idx_assignment_submissions_institution_student
  ON public.assignment_submissions (institution_id, student_profile_id, status);

CREATE INDEX idx_assignment_submissions_institution_enrolment
  ON public.assignment_submissions (institution_id, student_enrolment_id);
