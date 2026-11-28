-- P3-M01 Migration 11: Category- and visibility-scope-partitioned Digital
-- Student Handbook entries with composite tenant FKs.

CREATE TABLE public.handbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  student_profile_id uuid NOT NULL,
  category text NOT NULL CHECK (
    category IN (
      'academic_observation',
      'notice_ack',
      'parent_comm_ref',
      'disciplinary',
      'student_support'
    )
  ),
  visibility_scope text NOT NULL CHECK (
    visibility_scope IN (
      'student_and_guardian',
      'staff_academic',
      'class_teacher_and_leadership',
      'leadership_only'
    )
  ),
  teaching_group_id uuid,
  title text NOT NULL,
  body text NOT NULL,
  authored_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  acknowledged_by_guardian_at timestamptz,
  acknowledged_by_guardian_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, teaching_group_id)
    REFERENCES public.teaching_groups(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TRIGGER trg_handbook_entries_updated_at
  BEFORE UPDATE ON public.handbook_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_handbook_entries_inst_student_category
  ON public.handbook_entries (institution_id, student_profile_id, category, status);

CREATE INDEX idx_handbook_entries_inst_session_scope
  ON public.handbook_entries (institution_id, session_id, visibility_scope);
