# ADR-0004: Normalized Core Registry & Sensitivity-Scoped Custom Field Engine

- **ID & Title:** `ADR-0004` — Normalized Core Registry & Sensitivity-Scoped Custom Field Engine
- **Status:** Accepted
- **Date:** 2026-11-27
- **Decision Owner:** Product Owner (DD-oodle)

---

## Context / Problem

Educational institutions under CBSE and Indian multi-board norms share standard identity, guardian, staff, and admission fields (`admission_number`, `employee_code`, optional non-PK `pen_number` and `apaar_id`), yet individual schools also collect custom administrative or pastoral attributes (e.g., `house_name`, bus stop notes, or restricted counseling/medical observations). Dumping all institutional records into unstructured JSON degrades searchability, foreign-key integrity, and compliance controls, whereas altering database tables for every institution-specific attribute violates multi-tenant SaaS maintainability. Sensitive extensions (such as counseling notes) also require stricter access isolation than general school attributes like student house names.

## Options Considered

1. **Normalized core registry tables + sensitivity-classified EAV custom field tables:** Store searchable standard columns on normalized `student_profiles`, `staff_profiles`, `student_guardians`, and `admission_applications`; store custom attributes in `custom_field_definitions` (`sensitivity_level`: `standard` | `restricted` | `confidential`) and `custom_field_values` enforced by RLS.
2. **Untyped JSONB blob column on `student_profiles` / `staff_profiles`:** Zero extra tables, but prevents field-level sensitivity policies under PostgreSQL RLS (anyone reading a student row would read sensitive notes).
3. **Per-tenant dynamic SQL DDL columns:** Prohibitive security, migration, and schema-drift risk in shared multi-tenant PostgreSQL.

## Decision & Rationale

Adopt **Option 1**:

1. **Normalized Core Registry (`Blueprint §6.1`):** Keep core attributes normalized and strongly typed on `student_profiles`, `staff_profiles`, `student_guardians`, and `admission_applications`, linked to global `public.persons` (`ADR-0002`) and scoped by `institution_id`. Store optional `pen_number` and `apaar_id` strictly as nullable non-primary-key metadata with explicit verification fields — never store Aadhaar numbers.
2. **Controlled Extension Definitions (`custom_field_definitions`):** Enforce validated `field_key` naming (`^[a-z][a-z0-9_]{1,49}$`), explicit `data_type` (`text` | `number` | `date` | `boolean` | `select`), array-typed `options_json`, `entity_type` (`student` | `staff` | `guardian` | `admission`), and explicit `sensitivity_level` (`standard` | `restricted` | `confidential`).
3. **PostgreSQL Sensitivity Enforcement (`custom_field_values`):** Enforce read and write visibility in PostgreSQL RLS via `app_auth.can_read_custom_field(...)`:
   - `standard`: readable by authorized `people.read`, scoped student/guardian/academic staff (for student entities), or own staff profile.
   - `restricted`: requires `people.restricted.read` or `people.sensitive.read`.
   - `confidential`: requires `people.sensitive.read` (for reads) and `people.manage` + `people.sensitive.write` (for writes), blocking teachers, guardians, and monitors regardless of client UI state.

## Security / Privacy / Data Implications

- Supports DPDP data-minimization and least-privilege separation so student house/activity fields remain accessible to teaching staff while confidential pastoral/counseling fields remain hidden in SQL RLS (`202611270006_phase2_rls_and_helpers.sql`).
- Omitting Aadhaar fields avoids high-risk statutory identity storage in the core registry.
- Composite foreign key `(institution_id, definition_id)` guarantees values cannot reference custom field definitions from another institution.

## Cost / Maintenance Implications

- Cleanly supports institution-configured fields across Phase 2 admissions, student/staff directories, and Phase 3 digital handbooks without schema migrations per school.
- Field-level sensitivity checks rely on indexed `custom_field_definitions` lookups inside `SECURITY DEFINER` helpers with locked `SET search_path = ''`.

## Migration / Rollback Implications

- Introduced cleanly in `202611270004_people_registry_and_custom_fields.sql` and `202611270006_phase2_rls_and_helpers.sql`.
- Institution custom fields are tenant-scoped configuration data; definitions can be deactivated (`is_active = false`) without dropping historical values.

## Consequences & Revisit Conditions

- **Consequences:** Phase 2+ registry UI and import/export pipelines must map normalized core attributes to the core tables and institution-specific attributes exclusively to `custom_field_definitions` / `custom_field_values`, honoring `sensitivity_level`.
- **Revisit conditions:** Should regulatory rules require envelope encryption or separate custody for clinical/health attachments, medical records belong in Phase 8 clinic schemas + private Storage rather than `custom_field_values`.

## Links to Requirements & Implementation Milestones

- Master Blueprint: Part A §6.1, §6.2, §10.4, §15 Phase 2, §18 (#8, #18).
- Related ADRs: [`ADR-0001`](ADR-0001-multi-tenant-database-strategy.md), [`ADR-0002`](ADR-0002-person-identity-and-session-enrolment.md).
- Milestones: `P2-M01` (`202611270004`, `202611270006`, `supabase/seed.sql`, `02_phase2_registry_and_academics_rls.test.sql`).
