-- P4-M01 Migration 15: Structured Communication, Scoped Official Notices,
-- Notice Acknowledgements, Formal Parent Enquiries, and Mutually Exclusive
-- Record-Bound Contextual Comments (zero open chat/DM surfaces).

-- 1. Scoped Official Notices
CREATE TABLE public.official_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  scope_type text NOT NULL CHECK (
    scope_type IN ('institution', 'department', 'section', 'teaching_group')
  ),
  department_id uuid,
  section_id uuid,
  teaching_group_id uuid,
  category text NOT NULL CHECK (
    category IN ('general', 'academic', 'exam', 'attendance', 'event', 'urgent')
  ),
  title text NOT NULL,
  body text NOT NULL,
  requires_acknowledgement boolean NOT NULL DEFAULT false,
  is_offline_cacheable boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'archived')
  ),
  published_at timestamptz,
  authored_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (
      scope_type = 'institution'
      AND department_id IS NULL
      AND section_id IS NULL
      AND teaching_group_id IS NULL
    )
    OR (
      scope_type = 'department'
      AND department_id IS NOT NULL
      AND section_id IS NULL
      AND teaching_group_id IS NULL
    )
    OR (
      scope_type = 'section'
      AND department_id IS NULL
      AND section_id IS NOT NULL
      AND teaching_group_id IS NULL
    )
    OR (
      scope_type = 'teaching_group'
      AND department_id IS NULL
      AND section_id IS NULL
      AND teaching_group_id IS NOT NULL
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

-- 2. Notice Acknowledgements
CREATE TABLE public.notice_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  notice_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  student_profile_id uuid,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, notice_id)
    REFERENCES public.official_notices(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_notice_acknowledgements_unique
  ON public.notice_acknowledgements (
    institution_id,
    notice_id,
    person_id,
    COALESCE(student_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- 3. Formal Parent Enquiries (Structured Case Lifecycle)
CREATE TABLE public.parent_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  student_profile_id uuid NOT NULL,
  guardian_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  category text NOT NULL CHECK (
    category IN ('academic', 'attendance', 'administration', 'transport', 'welfare', 'other')
  ),
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_review', 'resolved', 'closed')
  ),
  assigned_to_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  section_id uuid,
  teaching_group_id uuid,
  resolution_summary text,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, section_id)
    REFERENCES public.sections(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, teaching_group_id)
    REFERENCES public.teaching_groups(institution_id, id)
    ON DELETE RESTRICT
);

-- 4. Strictly Record-Bound Contextual Comments (never unlinked or chat rooms)
CREATE TABLE public.record_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  parent_kind text NOT NULL CHECK (
    parent_kind IN ('notice', 'parent_enquiry', 'assignment')
  ),
  notice_id uuid,
  parent_enquiry_id uuid,
  assignment_id uuid,
  authored_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  body text NOT NULL,
  is_internal_staff_note boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (
      parent_kind = 'notice'
      AND notice_id IS NOT NULL
      AND parent_enquiry_id IS NULL
      AND assignment_id IS NULL
    )
    OR (
      parent_kind = 'parent_enquiry'
      AND notice_id IS NULL
      AND parent_enquiry_id IS NOT NULL
      AND assignment_id IS NULL
    )
    OR (
      parent_kind = 'assignment'
      AND notice_id IS NULL
      AND parent_enquiry_id IS NULL
      AND assignment_id IS NOT NULL
    )
  ),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, notice_id)
    REFERENCES public.official_notices(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, parent_enquiry_id)
    REFERENCES public.parent_enquiries(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, assignment_id)
    REFERENCES public.assignments(institution_id, id)
    ON DELETE RESTRICT
);

-- updated_at triggers
CREATE TRIGGER trg_official_notices_updated_at
  BEFORE UPDATE ON public.official_notices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_notice_acknowledgements_updated_at
  BEFORE UPDATE ON public.notice_acknowledgements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_parent_enquiries_updated_at
  BEFORE UPDATE ON public.parent_enquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_record_comments_updated_at
  BEFORE UPDATE ON public.record_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- B-tree indexes on FK, RLS predicate, and filter columns
CREATE INDEX idx_official_notices_institution_session_status
  ON public.official_notices (institution_id, session_id, status, scope_type);

CREATE INDEX idx_official_notices_institution_targets
  ON public.official_notices (institution_id, department_id, section_id, teaching_group_id);

CREATE INDEX idx_notice_acknowledgements_institution_notice
  ON public.notice_acknowledgements (institution_id, notice_id, person_id);

CREATE INDEX idx_parent_enquiries_institution_student_status
  ON public.parent_enquiries (institution_id, student_profile_id, status);

CREATE INDEX idx_parent_enquiries_institution_guardian
  ON public.parent_enquiries (institution_id, guardian_person_id, created_at DESC);

CREATE INDEX idx_parent_enquiries_institution_targets
  ON public.parent_enquiries (institution_id, section_id, teaching_group_id, assigned_to_person_id);

CREATE INDEX idx_record_comments_institution_notice
  ON public.record_comments (institution_id, notice_id, created_at)
  WHERE notice_id IS NOT NULL;

CREATE INDEX idx_record_comments_institution_enquiry
  ON public.record_comments (institution_id, parent_enquiry_id, created_at)
  WHERE parent_enquiry_id IS NOT NULL;

CREATE INDEX idx_record_comments_institution_assignment
  ON public.record_comments (institution_id, assignment_id, created_at)
  WHERE assignment_id IS NOT NULL;
