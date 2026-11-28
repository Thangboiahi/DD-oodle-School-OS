-- P5-M01 Migration 17: Phase 5 Venues, Timetable Periods, Versioned Timetables,
-- Conflict-Guarded Slots, Date-Scoped Substitutions, and Academic Calendar Events.

-- 1. Institutional Venues
CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  venue_kind text NOT NULL CHECK (
    venue_kind IN ('classroom', 'lab', 'hall', 'library', 'sports', 'other')
  ),
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  building text,
  floor text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, code)
);

-- 2. Bell-Schedule Periods
CREATE TABLE public.timetable_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  code text NOT NULL,
  label text NOT NULL,
  period_kind text NOT NULL CHECK (
    period_kind IN ('instructional', 'break', 'assembly', 'activity')
  ),
  sequence_no integer NOT NULL CHECK (sequence_no > 0),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, code)
);

-- 3. Versioned Weekly Timetables
CREATE TABLE public.timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  term_id uuid,
  code text NOT NULL,
  name text NOT NULL,
  version_no integer NOT NULL DEFAULT 1 CHECK (version_no > 0),
  effective_from date NOT NULL,
  effective_to date CHECK (effective_to IS NULL OR effective_to >= effective_from),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'archived')
  ),
  is_offline_cacheable boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  published_by_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  authored_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, session_id, code, version_no),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, term_id)
    REFERENCES public.academic_terms(institution_id, id)
    ON DELETE RESTRICT
);

-- 4. Conflict-Guarded Weekly Timetable Slots
CREATE TABLE public.timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  timetable_id uuid NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period_id uuid NOT NULL,
  teaching_group_id uuid,
  section_id uuid,
  teacher_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  venue_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (teaching_group_id IS NOT NULL OR section_id IS NOT NULL),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, timetable_id)
    REFERENCES public.timetables(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, period_id)
    REFERENCES public.timetable_periods(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, teaching_group_id)
    REFERENCES public.teaching_groups(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, section_id)
    REFERENCES public.sections(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, venue_id)
    REFERENCES public.venues(institution_id, id)
    ON DELETE RESTRICT
);

-- 5. Date-Scoped Daily Substitutions (never mutates published template)
CREATE TABLE public.timetable_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  timetable_slot_id uuid NOT NULL,
  substitution_date date NOT NULL,
  original_teacher_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  substitute_teacher_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'assigned' CHECK (
    status IN ('assigned', 'completed', 'cancelled')
  ),
  assigned_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, id),
  UNIQUE (institution_id, timetable_slot_id, substitution_date),
  FOREIGN KEY (institution_id, timetable_slot_id)
    REFERENCES public.timetable_slots(institution_id, id)
    ON DELETE RESTRICT
);

-- 6. Scoped Academic Calendar Events
CREATE TABLE public.academic_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL,
  term_id uuid,
  scope_type text NOT NULL DEFAULT 'institution' CHECK (
    scope_type IN ('institution', 'department', 'section')
  ),
  department_id uuid,
  section_id uuid,
  event_kind text NOT NULL CHECK (
    event_kind IN ('holiday', 'working_day', 'exam', 'parent_meeting', 'event', 'deadline', 'activity')
  ),
  title text NOT NULL,
  description text,
  starts_on date NOT NULL,
  ends_on date NOT NULL CHECK (ends_on >= starts_on),
  is_non_instructional boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'published' CHECK (
    status IN ('draft', 'published', 'cancelled')
  ),
  authored_by_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope_type = 'institution' AND department_id IS NULL AND section_id IS NULL)
    OR (scope_type = 'department' AND department_id IS NOT NULL AND section_id IS NULL)
    OR (scope_type = 'section' AND section_id IS NOT NULL AND department_id IS NULL)
  ),
  UNIQUE (institution_id, id),
  FOREIGN KEY (institution_id, session_id)
    REFERENCES public.academic_sessions(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, term_id)
    REFERENCES public.academic_terms(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, department_id)
    REFERENCES public.academic_departments(institution_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, section_id)
    REFERENCES public.sections(institution_id, id)
    ON DELETE RESTRICT
);

-- Updated_at Triggers
CREATE TRIGGER trg_venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_timetable_periods_updated_at
  BEFORE UPDATE ON public.timetable_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_timetables_updated_at
  BEFORE UPDATE ON public.timetables
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_timetable_slots_updated_at
  BEFORE UPDATE ON public.timetable_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_timetable_substitutions_updated_at
  BEFORE UPDATE ON public.timetable_substitutions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_academic_calendar_events_updated_at
  BEFORE UPDATE ON public.academic_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Partial Unique Conflict Prevention Indexes (no double-booking within same timetable version)
CREATE UNIQUE INDEX uq_timetable_slots_teacher
  ON public.timetable_slots (institution_id, timetable_id, day_of_week, period_id, teacher_person_id)
  WHERE teacher_person_id IS NOT NULL;

CREATE UNIQUE INDEX uq_timetable_slots_venue
  ON public.timetable_slots (institution_id, timetable_id, day_of_week, period_id, venue_id)
  WHERE venue_id IS NOT NULL;

CREATE UNIQUE INDEX uq_timetable_slots_teaching_group
  ON public.timetable_slots (institution_id, timetable_id, day_of_week, period_id, teaching_group_id)
  WHERE teaching_group_id IS NOT NULL;

-- B-tree Indexes on FK, RLS, and Filter Columns
CREATE INDEX idx_venues_institution_kind_active
  ON public.venues (institution_id, venue_kind, is_active);

CREATE INDEX idx_timetable_periods_institution_seq
  ON public.timetable_periods (institution_id, sequence_no);

CREATE INDEX idx_timetables_institution_session_status
  ON public.timetables (institution_id, session_id, status);

CREATE INDEX idx_timetable_slots_institution_tt_day
  ON public.timetable_slots (institution_id, timetable_id, day_of_week, period_id);

CREATE INDEX idx_timetable_slots_institution_group
  ON public.timetable_slots (institution_id, teaching_group_id);

CREATE INDEX idx_timetable_slots_institution_section
  ON public.timetable_slots (institution_id, section_id);

CREATE INDEX idx_timetable_slots_institution_teacher
  ON public.timetable_slots (institution_id, teacher_person_id);

CREATE INDEX idx_timetable_substitutions_institution_date_status
  ON public.timetable_substitutions (institution_id, substitution_date, status);

CREATE INDEX idx_timetable_substitutions_institution_sub_teacher
  ON public.timetable_substitutions (institution_id, substitute_teacher_person_id, substitution_date);

CREATE INDEX idx_academic_calendar_events_institution_session_dates
  ON public.academic_calendar_events (institution_id, session_id, starts_on, status);

CREATE INDEX idx_academic_calendar_events_institution_dept_section
  ON public.academic_calendar_events (institution_id, department_id, section_id);
