-- P3-M01 Migration 10: Attendance policies, append-only attendance events ledger,
-- daily & period attendance registers, staff daily attendance, leave applications,
-- and parent attendance notices with composite tenant foreign keys.

CREATE TABLE public.attendance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  minimum_attendance_percent numeric(5,2) NOT NULL DEFAULT 75.00 CHECK (
    minimum_attendance_percent > 0 AND minimum_attendance_percent <= 100
  ),
  warning_threshold_percent numeric(5,2) NOT NULL DEFAULT 80.00 CHECK (
    warning_threshold_percent >= minimum_attendance_percent
    AND warning_threshold_percent <= 100
  ),
  period_attendance_enabled boolean NOT NULL DEFAULT false,
  biometric_enabled boolean NOT NULL DEFAULT false,
  policy_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id),
  UNIQUE (institution_id, id)
);

CREATE TABLE public.attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  subject_kind text NOT NULL CHECK (subject_kind IN ('student', 'staff')),
  student_profile_id uuid,
  staff_profile_id uuid,
  session_id uuid,
  section_id uuid,
  teaching_group_id uuid,
  attendance_date date NOT NULL,
  event_type text NOT NULL CHECK (
    event_type IN (
      'arrival',
      'day_roll',
      'period_roll',
      'early_departure',
      'dismissal',
      'staff_check_in',
      'staff_check_out',
      'correction'
    )
  ),
  attendance_status text NOT NULL CHECK (
    attendance_status IN (
      'present',
      'absent',
      'late',
      'half_day',
      'excused_leave',
      'on_duty'
    )
  ),
  source text NOT NULL DEFAULT 'manual' CHECK (
    source IN ('manual', 'offline_queue', 'device_gateway')
  ),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  recorded_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  correction_of_event_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (subject_kind = 'student' AND student_profile_id IS NOT NULL AND staff_profile_id IS NULL)
    OR (subject_kind = 'staff' AND staff_profile_id IS NOT NULL AND student_profile_id IS NULL)
  ),
  CHECK (
    event_type <> 'correction'
    OR nullif(trim(coalesce(reason, '')), '') IS NOT NULL
  ),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, idempotency_key),
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, staff_profile_id)
    REFERENCES public.staff_profiles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, section_id)
    REFERENCES public.sections(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, teaching_group_id)
    REFERENCES public.teaching_groups(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, correction_of_event_id)
    REFERENCES public.attendance_events(institution_id, id)
    ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION public.prevent_attendance_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'public.attendance_events is append-only; UPDATE and DELETE are prohibited.'
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_attendance_events_immutable
  BEFORE UPDATE OR DELETE ON public.attendance_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_attendance_event_mutation();

CREATE TABLE public.student_daily_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  student_enrolment_id uuid NOT NULL,
  student_profile_id uuid NOT NULL,
  section_id uuid NOT NULL,
  attendance_date date NOT NULL,
  status text NOT NULL CHECK (
    status IN ('present', 'absent', 'late', 'half_day', 'excused_leave', 'on_duty')
  ),
  verification_status text NOT NULL DEFAULT 'draft' CHECK (
    verification_status IN ('draft', 'class_teacher_verified', 'signed_off')
  ),
  marked_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  verified_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  verified_at timestamptz,
  signed_off_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  signed_off_at timestamptz,
  correction_count integer NOT NULL DEFAULT 0 CHECK (correction_count >= 0),
  last_correction_reason text,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, student_enrolment_id, attendance_date),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_enrolment_id)
    REFERENCES public.student_session_enrolments(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, section_id)
    REFERENCES public.sections(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.student_period_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  student_enrolment_id uuid NOT NULL,
  student_profile_id uuid NOT NULL,
  teaching_group_id uuid NOT NULL,
  attendance_date date NOT NULL,
  period_code text NOT NULL,
  status text NOT NULL CHECK (
    status IN ('present', 'absent', 'late', 'excused_leave', 'on_duty')
  ),
  marked_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, student_enrolment_id, teaching_group_id, attendance_date, period_code),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_enrolment_id)
    REFERENCES public.student_session_enrolments(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, teaching_group_id)
    REFERENCES public.teaching_groups(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.staff_daily_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  staff_profile_id uuid NOT NULL,
  attendance_date date NOT NULL,
  status text NOT NULL CHECK (
    status IN ('present', 'absent', 'late', 'half_day', 'on_leave', 'on_duty')
  ),
  check_in_at timestamptz,
  check_out_at timestamptz,
  verification_status text NOT NULL DEFAULT 'draft' CHECK (
    verification_status IN ('draft', 'verified', 'signed_off')
  ),
  marked_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  signed_off_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  signed_off_at timestamptz,
  correction_count integer NOT NULL DEFAULT 0 CHECK (correction_count >= 0),
  last_correction_reason text,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, staff_profile_id, attendance_date),
  FOREIGN KEY (institution_id, staff_profile_id)
    REFERENCES public.staff_profiles(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  applicant_kind text NOT NULL CHECK (applicant_kind IN ('student', 'staff')),
  session_id uuid,
  student_profile_id uuid,
  staff_profile_id uuid,
  starts_on date NOT NULL,
  ends_on date NOT NULL CHECK (ends_on >= starts_on),
  leave_type text NOT NULL CHECK (
    leave_type IN ('sick', 'casual', 'family', 'medical', 'duty', 'other')
  ),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'approved', 'rejected', 'cancelled')
  ),
  submitted_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  reviewed_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (applicant_kind = 'student' AND student_profile_id IS NOT NULL AND staff_profile_id IS NULL)
    OR (applicant_kind = 'staff' AND staff_profile_id IS NOT NULL AND student_profile_id IS NULL)
  ),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, staff_profile_id)
    REFERENCES public.staff_profiles(institution_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE public.parent_attendance_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  student_profile_id uuid NOT NULL,
  guardian_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  attendance_date date NOT NULL,
  notice_kind text NOT NULL CHECK (
    notice_kind IN ('absence', 'late_arrival', 'early_pickup')
  ),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'acknowledged')
  ),
  acknowledged_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, student_profile_id)
    REFERENCES public.student_profiles(institution_id, id)
    ON DELETE RESTRICT
);

-- updated_at triggers on mutable Phase 3 attendance/leave tables
CREATE TRIGGER trg_attendance_policies_updated_at
  BEFORE UPDATE ON public.attendance_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_student_daily_attendance_updated_at
  BEFORE UPDATE ON public.student_daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_student_period_attendance_updated_at
  BEFORE UPDATE ON public.student_period_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_staff_daily_attendance_updated_at
  BEFORE UPDATE ON public.staff_daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_leave_applications_updated_at
  BEFORE UPDATE ON public.leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_parent_attendance_notices_updated_at
  BEFORE UPDATE ON public.parent_attendance_notices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- B-tree indexes on FK, RLS, and date paths
CREATE INDEX idx_attendance_events_institution_date_subject
  ON public.attendance_events (institution_id, attendance_date, subject_kind);

CREATE INDEX idx_attendance_events_institution_section_group
  ON public.attendance_events (institution_id, section_id, teaching_group_id);

CREATE INDEX idx_student_daily_attendance_inst_date_section
  ON public.student_daily_attendance (institution_id, attendance_date, section_id, verification_status);

CREATE INDEX idx_student_daily_attendance_inst_student
  ON public.student_daily_attendance (institution_id, student_profile_id, attendance_date);

CREATE INDEX idx_student_period_attendance_inst_group_date
  ON public.student_period_attendance (institution_id, teaching_group_id, attendance_date);

CREATE INDEX idx_student_period_attendance_inst_student_date
  ON public.student_period_attendance (institution_id, student_profile_id, attendance_date);

CREATE INDEX idx_staff_daily_attendance_inst_date_staff
  ON public.staff_daily_attendance (institution_id, attendance_date, staff_profile_id);

CREATE INDEX idx_leave_applications_inst_status_dates
  ON public.leave_applications (institution_id, status, starts_on, ends_on);

CREATE INDEX idx_leave_applications_inst_targets
  ON public.leave_applications (institution_id, student_profile_id, staff_profile_id);

CREATE INDEX idx_parent_attendance_notices_inst_date_student
  ON public.parent_attendance_notices (institution_id, attendance_date, student_profile_id);
