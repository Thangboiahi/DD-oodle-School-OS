# Milestone Report: P2-M01 — Phase 2 ADRs, Registry & CBSE XI–XII Academic Schema, Relationship RLS & pgTAP Suite

- **Date:** 2026-11-27
- **Phase:** Phase 2 — Institutional Registry and Academic Structure (**In Progress**)
- **Milestone:** `P2-M01`
- **Status:** Local checks passed; awaiting live GitHub Actions CI confirmation (updated immediately post-CI)

---

## 1. Summary of Changes

1. **Accepted Architecture Decision Records (`docs/decisions/`):**
   - Added [`ADR-0003`](../decisions/ADR-0003-academic-structure-and-typed-assignments.md) defining separated academic structure concepts, cross-section teaching groups, composite tenant FKs, and typed time-bound `academic_assignments`.
   - Added [`ADR-0004`](../decisions/ADR-0004-normalized-custom-field-engine.md) defining normalized core registries paired with sensitivity-classified custom field definitions/values (`standard` | `restricted` | `confidential`) enforced in PostgreSQL RLS.
2. **19-Table Phase 2 Schema Migrations (`supabase/migrations/`):**
   - [`202611270004_people_registry_and_custom_fields.sql`](../../supabase/migrations/202611270004_people_registry_and_custom_fields.sql): 6 tables (`student_profiles` with optional `pen_number`/`apaar_id` and no Aadhaar column, `staff_profiles`, `student_guardians`, `admission_applications`, `custom_field_definitions`, `custom_field_values`).
   - [`202611270005_academic_structure_and_assignments.sql`](../../supabase/migrations/202611270005_academic_structure_and_assignments.sql): 13 tables (`academic_sessions` with single-active partial unique index, `academic_terms`, `academic_departments`, `grade_levels`, `sections`, `streams`, `subjects`, `subject_offerings`, `student_session_enrolments`, `student_subject_enrolments`, `teaching_groups`, `teaching_group_memberships`, `academic_assignments`).
   - [`202611270006_phase2_rls_and_helpers.sql`](../../supabase/migrations/202611270006_phase2_rls_and_helpers.sql): 5 `STABLE SECURITY DEFINER SET search_path = ''` `app_auth` helpers and `ENABLE` + `FORCE ROW LEVEL SECURITY` initPlan policies across all 19 tables.
3. **CBSE XI–XII Synthetic Seed & pgTAP Verification (`supabase/seed.sql`, `supabase/tests/`):**
   - Expanded `supabase/seed.sql` while preserving all 4 Phase 1 accounts/roles/audit rows, adding `hod.srsec.sunrise@example.test`, `classteacher.11a.sunrise@example.test`, `monitor.11a.sunrise@example.test`, and `student.11b.sunrise@example.test`, Senior Secondary `2026-27` terms/sections/streams/mixed electives, cross-section `TG-XI-APPMATH-1` & `TG-XI-CS-1`, guardian link for `dual.member@example.test` on Valley `Kabir Rao`, and `house_name` (`standard`) + `counseling_note` (`confidential`) custom fields.
   - Added [`02_phase2_registry_and_academics_rls.test.sql`](../../supabase/tests/02_phase2_registry_and_academics_rls.test.sql) (30 pgTAP assertions) and updated [`sql-migration-invariants.test.ts`](../../tests/unit/sql-migration-invariants.test.ts) (verifying 26 forced-RLS tables and `SECURITY DEFINER` `SET search_path = ''` lock).

---

## 2. Verification Results

- Pending post-push CI run verification (will be updated with exact GitHub Actions Run ID, URL, and job counts once CI completes).
