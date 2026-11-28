-- P3-M01 Fix (Migration 13): Enforce append-only immutability on public.attendance_events
-- at the statement level so UPDATE and DELETE raise SQLSTATE 42501 immediately for both
-- authenticated callers (even when RLS matches 0 rows) and privileged roles.

DROP TRIGGER IF EXISTS trg_attendance_events_immutable ON public.attendance_events;

CREATE TRIGGER trg_attendance_events_immutable
  BEFORE UPDATE OR DELETE ON public.attendance_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.prevent_attendance_event_mutation();
