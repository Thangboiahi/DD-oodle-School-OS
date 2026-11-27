# DD-oodle Domain Glossary

> **Canonical Source:** [`../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md`](../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md) (Part A §1–§9)

This glossary establishes unambiguous domain terminology across product, schema, API and UI code.

| Term | Canonical Definition | Key Boundary / Constraint |
|---|---|---|
| **Institution / Tenant** | An independent school or educational organisation operating an isolated workspace within DD-oodle. | All tenant-owned records are isolated by `institution_id` at both server and PostgreSQL RLS layers. |
| **Person Identity** | A single, permanent global human account/identity (`person`) representing an individual across time and institutions. | One person may concurrently be a teacher, parent, student, guardian or alumni without duplicate accounts. |
| **Membership** | A person's scoped association with a specific institution (e.g., staff, student, guardian, alumni). | Removing or revoking an institution membership never deletes the global person identity or other memberships. |
| **Academic Session** | A bounded institutional academic year/cycle (e.g., `2026-27`) containing terms, enrolments and historical records. | Historical sessions become read-only archives after transition; never overwrite past session records on promotion. |
| **Class / Grade** | An academic level in the institution's progression structure (e.g., Class XI, Class XII). | Separate from administrative departments (e.g., a Senior Secondary HOD may oversee both Classes XI and XII). |
| **Section** | An administrative cohort within a class/grade for a given session (e.g., XI A, XI B) led by a Class Teacher. | A section is an administrative cohort—not an assumption that all its students share identical subjects. |
| **Subject Offering** | A subject from the institution catalogue made available for a specific session and class/grade. | Enables per-session curriculum versioning and optional/elective configurations. |
| **Stream** | A structured subject grouping or track (e.g., Science, Commerce, Humanities in Senior Secondary), where configured. | Optional institutional grouping; must not prevent mixed or individual elective enrolments. |
| **Teaching Group** | The specific set of students attending a subject or learning activity taught by assigned subject teacher(s). | Students from multiple sections may share one teaching group; one section may split across multiple teaching groups. |
| **Time-Bound Assignment** | A scoped, dated responsibility record (e.g., Subject Teacher, Class Teacher, HOD, Monitor/Monitress, Acting Cover). | Staff responsibilities are assignments with start/end dates, session and scope—never permanent user attributes. |
| **Digital Student Handbook** | A student-specific, structured operational record aggregating attendance, leave, fees, assignments, observations, notices and discipline. | Protected by category- and field-level privacy; not all sections are visible to every role. |
| **Credential Exchange** | DD-oodle's directory and verification infrastructure for requesting and verifying institutional certificates/documents. | The issuing institution remains the sole authority for approving and issuing credentials; public QR reveals minimum verification fields only. |
| **Study Buddy Boundary** | Integration contract connecting DD-oodle with the independent Study Buddy learning product. | DD-oodle may share permitted syllabus/enrolment/assignments; private learner goals, notes and study history remain isolated from schools. |
