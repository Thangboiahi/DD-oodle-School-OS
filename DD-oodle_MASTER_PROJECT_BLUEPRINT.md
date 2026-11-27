# DD-oodle — Master Project Blueprint, Handover & AI Development Operating System

> **Document status:** Master baseline for product discovery, architecture, implementation and future evolution  
> **Product owner:** DD-oodle  
> **Product:** DD-oodle School Management Platform  
> **Document version:** 1.0.0  
> **Baseline date:** 27 November 2026  
> **Primary reference institution:** An Indian CBSE school with a class-wise departmental structure and senior-secondary subject streams  
> **Implementation environment:** Google AI Studio and/or Google Antigravity, Gemini as project architect/prompt generator/development lead, GitHub for source control and project records

---

# HOW TO USE THIS DOCUMENT

This file is the authoritative starting handover for DD-oodle. It contains three things:

1. **Product and technical handover:** What DD-oodle is, why it exists, how it should work, its architecture, modules, data principles, security expectations, roadmap and future direction.
2. **Project common instructions:** The permanent rules that Gemini and any coding agent must follow throughout the project.
3. **Gemini source prompt:** The initial copy-ready instruction to give Gemini so it can take responsibility for understanding the project, establishing the repository documentation system and directing the implementation process.

## Recommended repository location

Place this file in the root of the DD-oodle GitHub repository as:

`DD-oodle_MASTER_PROJECT_BLUEPRINT.md`

Treat this as the canonical product and architecture baseline. The repository should also contain a concise `PROJECT_INSTRUCTIONS.md` derived from Part B. If the selected AI tool has a verified native instruction-file convention (for example, a Gemini-specific or Antigravity-specific rules file), create a small adapter file that points back to the canonical instructions. Do not create multiple competing master plans.

## How to start

1. Create or open the GitHub repository for DD-oodle.
2. Add this Markdown file to the repository root.
3. Open the repository in Google Antigravity or the chosen development environment. Google AI Studio may be used for planning/prompt generation and code tasks where its current capabilities support the required repository workflow.
4. Start a Gemini conversation dedicated to DD-oodle project leadership.
5. Copy the **Gemini Source Prompt** in Part C and send it to Gemini.
6. Gemini must read this entire file and inspect the actual repository before proposing or changing code.
7. Gemini must create the documentation and project-control structure described in Part B before the first implementation milestone.

Do not start by asking an agent to generate the entire application in one prompt. Build and verify bounded milestones.

---

# PART A — PRODUCT HANDOVER AND COMPREHENSIVE MASTER PLAN

# 1. Product vision

## 1.1 Product identity

**DD-oodle** is a configurable, multi-institution School Operations and Learning Ecosystem designed initially for Indian schools, with a particular focus on the operational realities of CBSE schools.

It is not merely a fee-management or attendance ERP. It is a connected operating platform for institutional governance, academic operations, student and staff records, parent involvement, school administration, facilities, documents, certificates and authorised integrations.

The product should make school operations more organised, accountable, transparent to the appropriate people, efficient and less dependent on fragmented spreadsheets, registers, paper forms and informal forwarding of messages.

## 1.2 Mission

Build a platform that:

- Helps school leadership govern the institution through reliable records, workflows and reports.
- Helps teachers teach and manage their responsibilities without unnecessary administrative burden.
- Gives class teachers a coordinated view of their sections while distributing subject-specific responsibilities to the appropriate subject teachers.
- Connects students and parents to official school information, learning tasks and relevant records.
- Gives administrative and support staff clear, permission-appropriate tools.
- Preserves institutional records across academic sessions and staff/student lifecycle changes.
- Adapts to different Indian education boards and institution structures without requiring a separate codebase for every school.
- Can grow into a broader education-services ecosystem under DD-oodle.

## 1.3 Product principles — non-negotiable

1. **One person, one global identity:** A person may simultaneously be a teacher, class teacher, HOD, parent, student, guardian, alumni member or other role. Roles are concurrent contexts, not mutually exclusive account types.
2. **Institution isolation:** Each institution's data, settings, staff, students, workflows and files must be isolated from every other institution.
3. **Configurable governance:** Roles, positions, departments, approval chains, academic models and custom fields must be configurable.
4. **Relationship-based access:** Permission depends on the user's role, institution, assignment, relationship to the record, resource sensitivity and requested action.
5. **Historical continuity:** A person's identity persists; academic enrolments and staff assignments change over time; historic records remain attributable to the correct session.
6. **WhatsApp for casual chatting; DD-oodle for structured school operations:** Do not build a general-purpose native chat clone.
7. **Authoritative records stay in DD-oodle:** WhatsApp may be used for informal coordination or supported notifications, but it must not become the system of record for official notices, approvals, attendance, submissions, fees, disciplinary records or certificates.
8. **Mobile-first, not mobile-only:** The product must work well on phones, tablets and desktops, in portrait and landscape.
9. **Privacy and child safety by design:** Minimise collection, restrict access and log sensitive actions.
10. **Modular monolith first:** Keep the initial architecture understandable and maintainable; extract background workers or services only when justified.
11. **Incremental implementation:** Complete one bounded milestone at a time, test it, document it and commit/push it.
12. **No fake completion:** Never claim a feature, test, deployment, commit, push, compliance status or integration succeeded unless it was actually verified.

## 1.4 Product boundaries

DD-oodle is the institutional operating platform. It is not intended to:

- Replace WhatsApp as a general-purpose casual messenger.
- Become a social network for students.
- Make autonomous high-impact disciplinary, academic or welfare decisions.
- Replace government education portals or claim direct government API access without verified authorisation.
- Make the DD-oodle platform operator the owner of a school's academic decisions or issued certificates.
- Expose one institution's data to another institution or to DD-oodle support staff by default.
- Force every school to use the same hierarchy, academic calendar, examination pattern or fee structure.

---

# 2. Product environments and multi-tenant experience

DD-oodle consists of three principal user-facing environments and one platform-operating environment.

## 2.1 Public DD-oodle website

Purpose: product discovery, public information, institutional discovery and service entry.

Potential sections:

- DD-oodle overview and product features.
- Public institution profiles/directories where the institution opts in.
- Product plans and subscriptions.
- Help centre, guides and support.
- Institution sign-in and onboarding.
- Common account registration/sign-in.
- Public institutional announcements where explicitly published.
- DD-oodle Credential Exchange (certificate request discovery and verification entry).
- Future education-service marketplace.

The public marketing surface must not expose private console routes or institutional data.

## 2.2 Global personal account and workspace selector

One person has one DD-oodle identity. After signing in, the person can see their personal workspace, linked institutions and services.

Example membership contexts:

- Institution A — Teacher, Class Teacher, Applied Mathematics.
- Institution B — Parent/Guardian.
- Institution C — Student.
- Alumni access to a former institution.
- Personal certificates and credential requests.

Use a persistent institution/context switcher. Avoid asking the user to authenticate again each time unless the institution has explicitly configured additional authentication, MFA or SSO. Institution switching must re-evaluate context and permissions server-side.

Personal profile information must be separated from institution-specific membership information. Removing one institution membership must not delete the user's global identity or other memberships.

## 2.3 Institutional workspace

Each institution receives a configurable, isolated console. Example tenant URL:

`school-name.dd-oodle.com`

The console uses a common application foundation, but its navigation and permitted features are assembled from:

- Tenant configuration.
- Enabled module entitlements.
- Current user's active membership.
- Current roles and assignments.
- Resource relationships.
- Permission rules.

Different users see different workspaces without creating separate applications for each role.

## 2.4 DD-oodle platform console

Reserved for DD-oodle platform operations:

- Institution onboarding, verification and provisioning.
- Subscription plans, billing and entitlements.
- Platform usage and operational health.
- Support cases and authorised time-bound support access.
- Platform-wide integrations and notification providers.
- Marketplace moderation.
- Security incidents and platform audit records.
- Tenant lifecycle and infrastructure administration.

Platform staff must not automatically receive unrestricted access to institutional student, staff, financial, medical or academic records. Any exceptional support access requires a documented reason, approval, limited scope/time and a complete audit trail.

---

# 3. Reference institution: organisational and academic model

The first reference institution is an Indian CBSE school with a structure resembling the following. This is a reference configuration, not a hardcoded product assumption.

## 3.1 Leadership and management

- Principal: ultimate institutional authority and final approval/override authority.
- Vice Principal: primary executive for day-to-day school operations.
- Supervisors: oversee functional/non-teaching areas such as discipline, IT, facilities or other configured responsibilities.
- HODs: manage academic departments organised by class bands, not necessarily subject-wise. Example: Senior Secondary for Classes XI and XII.
- HR: staff records and employment operations.
- Accountants and accounts clerks: finance and fee operations with distinct permissions.
- HOD/department clerks: department records and administrative support.
- Teachers: subject teaching, classroom and other assigned duties.
- Caretakers and support staff.
- Nurses, laboratory staff, librarians, transport or other operational roles where present.

Institutions must be able to add, rename, disable and reorganise positions and reporting relationships.

## 3.2 Administrative hierarchy versus academic structure

Keep these concepts separate:

- Administrative organisation: departments, functional units, designations and reporting relationships.
- Academic organisation: academic sessions, grade/class, section, subjects, streams, teaching groups and student subject enrolments.

A class-wise department such as Senior Secondary is not the same as a subject department such as Mathematics. A school may configure both concepts, but the reference school uses class-band HODs.

## 3.3 Academic entities

Model at least:

- Academic year/session.
- Grade/class (XI, XII, X, etc.).
- Section (XI A, XI B, etc.).
- Subject catalogue.
- Subject offerings for a particular session/class.
- Stream or subject combination where applicable.
- Student subject enrolment.
- Teaching group.
- Timetable period and classroom/venue.
- Subject teacher assignment.
- Class teacher assignment.
- Academic coordinator/HOD assignment.

A section is an administrative cohort. A teaching group is the set of students who attend a specific subject or learning activity. A section's students may have different elective combinations, and students from different sections may share a teaching group. Do not assume that each section has one universal subject combination.

## 3.4 Staff responsibilities are assignments, not identity attributes

A teacher can concurrently be:

- Subject teacher for multiple subjects or teaching groups.
- Class teacher for a section.
- HOD or coordinator.
- Examination coordinator.
- Club/activity in-charge.
- Member of another functional responsibility.

Represent assignments as scoped, time-bound records with start/end dates, session, institution, role, resource scope, status and assigning authority.

## 3.5 Students and class leaders

Students belong to a person identity and have session-specific enrolments. Each section may have a class teacher, monitor and monitress. These roles are assigned for a configurable duration and may change by session or term.

Monitor/monitress tools are limited to classroom coordination, such as viewing the verified daily attendance summary and subject-wise assignment list for the physical board. They must never edit official attendance, marks, disciplinary records or protected student information.

---

# 4. Identity, role, permission and delegation model

## 4.1 Permission approach

Use a combination of:

- RBAC — role-based access control.
- ABAC — attribute-based access control.
- Relationship-based access — access because of a valid relationship to a resource.

An authorisation decision should consider:

`User + Institution + Role + Assignment + Relationship + Resource Sensitivity + Action + Scope + Time`

Examples:

- A Mathematics teacher may access academic records for students enrolled in their Mathematics teaching groups, but not automatically their medical or fee accounts.
- A class teacher may manage their assigned section and see the information needed to coordinate student welfare, subject progress and parent communication, subject to sensitive-record restrictions.
- A nurse may access authorised health information, not marksheets or salary records.
- A parent may access only their linked child/children and the categories permitted by guardian status and institutional policy.
- An accountant may process fees but not edit examination marks.
- A caretaker may receive assigned maintenance tasks and asset information, not student profiles.

## 4.2 Roles are configurable bundles, not permanent labels

Provide a role builder to configure:

- Role title and description.
- Module access.
- Actions: view, create, edit, submit, approve, reject, publish, export, delegate, archive.
- Scope: institution, campus, department, class, section, subject group, assigned records or self.
- Sensitive field restrictions.
- Effective dates.
- Delegation and substitute approvers.

Support temporary and acting assignments, leave cover, delegation and revocation.

## 4.3 Authority and audit

The Principal may have final institutional authority, but privileged access and overrides must remain attributable. Log the actor, action, target record, before/after values where appropriate, reason, timestamp, source and approval context.

A platform administrator is not automatically a school principal. Platform operation and institutional governance must remain separate.

---

# 5. Communication philosophy — WhatsApp for casual chatting; DD-oodle for school operations

This is an official product boundary.

## 5.1 WhatsApp's role

Use WhatsApp as the primary channel for informal, casual conversations where the institution already uses it:

- General staff chatting.
- Department staff chatting.
- Casual class-group discussions.
- Quick informal parent-teacher conversations.
- Everyday coordination and social conversation.

DD-oodle should not implement a full general-purpose chat application, chat history clone, open-ended group messenger, typing indicators, sticker system or equivalent messaging infrastructure simply to imitate WhatsApp.

## 5.2 DD-oodle's role

DD-oodle must provide structured, record-linked, actionable communication:

- Official school notices and announcements.
- Instructions and academic updates.
- Assignments, quizzes and submission requests.
- Study materials and learning resources.
- Attendance notifications and verified daily summaries.
- Formal parent enquiries and case-based communication.
- Leave applications and decisions.
- Acknowledgements and read/response requirements.
- Disciplinary records and controlled notifications.
- Tasks, reminders, approvals and escalations.
- Examination and result publication.
- Certificate/document requests and status updates.

## 5.3 Contextual comments are permitted

The platform may allow comments or responses attached to a specific item, such as an assignment question, attendance alert, notice acknowledgement or formal parent enquiry. These are contextual interactions tied to a record, not an unrestricted chat channel.

## 5.4 WhatsApp integration principles

- Provide click-to-chat/deep links where useful and permitted.
- Support official WhatsApp Business Platform integrations only where the institution has the required account, configuration, consent and API capability.
- Do not assume existing ordinary WhatsApp groups can be synchronised or managed by DD-oodle.
- Keep the authoritative notice, task, assignment, approval, attendance and document status in DD-oodle.
- A WhatsApp message must not itself count as an official approval, attendance correction, assignment submission or fee receipt.
- Allow notification preferences across in-app/PWA push, email, SMS and supported WhatsApp templates.
- Do not send every event through every channel. Provide per-user/per-event preference rules and critical-notice fallbacks.

---

# 6. Product modules and functional requirements

The modules below are product domains, not separate applications. Institutions can enable modules and subfeatures based on their configuration and subscription.

## 6.1 People and institutional registry

Student, guardian, staff and other person records with:

- Personal profiles and contact details.
- Admission and employment history.
- Guardian/student relationships.
- Emergency contacts.
- Address and configurable identifiers.
- Academic and employment history.
- Subject/stream information.
- Qualifications and credentials.
- Document checklist and verification status.
- Custom fields, field groups and validations.
- Restricted/sensitive field classifications.
- Individual and bulk operations.

Core fields must be normalised and searchable; do not hide the entire institutional database inside arbitrary JSON. Use configurable extension fields for institution-specific attributes.

## 6.2 Admissions and enrolment

- Enquiry and application records.
- Admission form builder.
- Document collection and review.
- Admission approvals.
- Student number/admission number generation.
- Initial academic enrolment.
- Guardian verification and linking.
- Bulk imports and migration tools.
- Waiting list and rejected/withdrawn application history.

## 6.3 Academic structure and allocation

- Academic sessions and terms.
- Classes, sections and streams.
- Subjects, electives and optional subjects.
- Student subject enrolments.
- Cross-section teaching groups.
- Teacher and class teacher assignments.
- Monitor/monitress assignments.
- Classroom, lab and venue allocation.
- Bulk promotion and allocation.
- Conflict detection and validation.

## 6.4 Attendance and leave

Student attendance events may include:

- First arrival/entry.
- Classroom/day attendance.
- Period-wise attendance where configured.
- Early departure.
- Final departure/dismissal.

Staff attendance may include check-in, check-out, late arrival, authorised duty, leave and correction workflows.

Support:

- Manual marking by authorised staff.
- Device events from configured biometric/card/QR systems.
- Device and local gateway integration.
- Offline event queue with idempotency and conflict resolution.
- Class teacher verification.
- Authorised sign-off.
- Parent notification rules.
- Late/absence alerts and attendance shortage monitoring.
- Leave applications, attachments, approvals and history.
- Correction reason and complete audit trail.
- Daily, monthly, term and session reports.

Biometric matching should preferably occur on the device. Do not store raw fingerprint templates or face images in the cloud by default. Make biometric attendance optional and provide non-biometric alternatives. Assess legal, consent, child-safety and vendor-security requirements before enabling any biometric feature.

## 6.5 Digital Student Handbook

A structured, student-specific record view containing relevant categories such as:

- Attendance summaries.
- Leave applications and decisions.
- Fee receipts and payment summaries.
- Assignment records across subjects.
- Subject-wise academic observations.
- Notices and acknowledgements.
- Parent communication references.
- Disciplinary records.
- Relevant student support records.

Do not make all handbook sections visible to every role. Financial, health and disciplinary entries require category-level and field-level privacy controls. The class teacher coordinates the section; subject teachers own subject-level entries; authorised office staff maintain their records.

## 6.6 Academic planning and syllabus

Support a hierarchy such as:

`Session → Term/Exam Cycle → Subject → Unit → Chapter → Topic → Weekly Plan → Lesson/Period`

Teachers can:

- Create/import syllabus structures.
- Use approved board/curriculum templates where verified.
- Break syllabus into units/topics.
- Set monthly/weekly/daily targets.
- Maintain lesson plans and learning objectives.
- Track not started / in progress / completed / revised / delayed states.
- Record delay reasons and carry-forward work.
- Attach resources.
- Generate class/subject/HOD progress reports.

AI may assist in syllabus decomposition and planning, but teachers must review and approve generated plans. Never imply an AI-generated curriculum is officially approved unless checked against the relevant official current source.

## 6.7 Assignments, quizzes and learning resources

A structured assignment should include subject, teaching group/target students, assigning teacher, type, issue/due dates, marks or rubric, attachments, instructions, online/offline/both submission method, evaluation method, visibility, status and publication history.

Support:

- MCQ/objective quizzes.
- Descriptive questions.
- File/photo submissions.
- Offline notebook-based assignments.
- Manual evaluation and remarks.
- Late/resubmitted work.
- Automated objective scoring.
- Question banks.
- Group/individual tasks.
- Teacher-created resources.
- Completion analytics across subjects.
- Student and parent views.

Teachers may record completion manually for offline work. Do not require every classroom activity to be digitised.

## 6.8 Examinations and results

- Examination calendar and timetable.
- Exam schemes and configurable assessment components.
- Subject-wise marks and grades.
- Internal and practical assessment.
- Marks entry, import and validation.
- Moderation and approval.
- Configurable grading and pass criteria.
- Report cards and progress reports.
- Term/session comparisons.
- Publication controls.
- Revision history and locked result snapshots.
- Parent/student access according to publication state.

CBSE patterns must be versioned and verified against current official requirements. Do not hardcode every institution to a single examination pattern.

## 6.9 Timetable and scheduling

- Weekly timetables.
- Periods, breaks and school hours.
- Teacher availability and workload.
- Subject/teaching-group allocation.
- Classrooms, labs and venues.
- Examination schedules.
- Events and activity schedules.
- Substitute teacher suggestions.
- Conflict detection.
- Published timetable versions and change notifications.

AI/optimisation may suggest a timetable but must not publish changes without authorised review.

## 6.10 Calendar and events

- Academic calendar.
- Holidays and working days.
- School events and activities.
- Examination dates.
- Parent meetings.
- Assignment and project deadlines.
- Staff duty schedules.
- Excursions, competitions, sports and cultural events.
- Permission slips, participant lists and attendance.

## 6.11 Finance and fees

- Fee structures by class/session/category.
- Installments and due dates.
- Concessions, scholarships and waivers.
- Late fees.
- Student ledgers.
- Receipts and adjustments.
- Refund workflow.
- Outstanding balances.
- Cash/bank/digital payment recording.
- Reconciliation and daily collection reports.
- Financial exports.
- Role-specific entry/approval permissions.

Payment gateway integration can be introduced after the core financial ledger and reconciliation workflows are proven. Never store card credentials or sensitive payment secrets in the client.

## 6.12 HR and staff management

- Recruitment/enquiry pipeline.
- Staff profiles and employment records.
- Appointment/contract records.
- Qualifications and documents.
- Department/designation/assignment history.
- Staff attendance and leave.
- Workload and timetable.
- Substitute availability.
- Salary/payroll readiness and controlled payroll data.
- Performance/professional-development records where institution policy permits.
- Staff transfer, role changes, relieving and retirement workflows.

## 6.13 Inventory, procurement and asset lifecycle

Manage furniture, IT equipment, lab apparatus, sports equipment, stationery, electrical assets, medical supplies and other stock.

Support:

- Asset tags and item catalogue.
- Quantity and stock levels.
- Location and department ownership.
- Purchase requests and approvals.
- Vendor and purchase information.
- Goods receipt.
- Issue, return and transfer.
- Consumable usage.
- Maintenance and repair.
- Condition and disposal.
- Annual physical verification.
- Audit-ready stock reports.

## 6.14 Facilities, health, laboratory and specialised operations

Optional modules may include:

**Nurse/clinic:** restricted medical profile, allergies/alerts, clinic visits, incidents, first aid, parent notification, referral and authorised medication records.

**Laboratory:** assets, consumables, practical schedules, equipment maintenance, student usage, safety checks and incidents.

**Facilities:** maintenance requests, repairs, inspections, caretaker tasks, room/asset status and completion evidence.

Future optional modules: library, transport, visitor management, hostel/residential management, canteen and school bus tracking. Each requires its own safety, privacy and operational assessment.

## 6.15 Documents and secure file management

- Private document collection.
- Document categories and templates.
- Upload validation and size/type limits.
- Secure preview/download.
- Versioning and replacement history.
- Expiry/reminder tracking.
- Review/verified/rejected/correction-required status.
- Bulk document requests.
- Parent upload access.
- Retention and legal hold.
- Audit logs for access/download and changes.

Avoid permanent public URLs for private student/staff documents. Use private object storage and authorised short-lived access where appropriate.

## 6.16 PDF reports and template editor

Build a template-based editor rather than a full general-purpose desktop publishing tool.

Support:

- A4, Letter, portrait/landscape and configurable page size.
- Text, fonts, alignment, colour and layout.
- Logos, seals, images, backgrounds, borders and watermarks.
- Dynamic data fields.
- Tables and multi-page documents.
- Signature blocks.
- QR verification block.
- Sample preview and data binding.
- Versioned templates.
- Bulk document generation.
- PDF export and secure delivery.

Use it for report cards, certificates, receipts, institutional letters, notices and staff/student documents. Official issued documents should not be silently editable; corrections follow controlled reissue/version procedures.

## 6.17 Credential Exchange — future and staged release

A DD-oodle-wide certificate/document request directory where users can discover participating institutions' request procedures and submit requests.

The issuing institution remains the authority for verifying, approving and issuing its documents. DD-oodle is the workflow and verification infrastructure, not the issuer of school credentials.

Potential document types: transfer, bonafide, study, character, marksheet, course completion, participation, experience and service certificates.

Each issued record may have a unique certificate ID, institution, issue date, document type, subject reference, version, verification token/QR, hash or signature evidence and revocation/reissue status.

Public QR verification must reveal only the minimum details required to establish authenticity, not the person's complete student/staff record.

## 6.18 Workflow and governance engine

A configurable workflow engine should support:

- Leave approvals.
- Certificate requests.
- Fee concessions/refunds.
- Procurement.
- Marks/result moderation.
- Disciplinary process.
- Document verification.
- Maintenance tasks.
- Complaints and escalation.
- Notice approvals.
- Staff delegation and substitutions.

Workflow definitions need stages, conditions, approvers, delegated approvers, time limits, reminders, rejection reasons, resubmission, audit history and versioning.

## 6.19 Institutional analytics and reports

Dashboards must be role-specific and explain the data period and filters.

Examples:

- Principal: enrolment, attendance, academics, finances, staff, approvals and institutional alerts.
- Vice Principal: daily operations, pending items, attendance concerns, teacher availability and follow-up tasks.
- HOD: class-band student strength, syllabus progress, teacher workload, subject results and assignment completion.
- Class teacher: daily attendance, absences, late arrivals, section assignments, notices, student concerns and parent follow-ups.
- Subject teacher: timetable, groups, syllabus, assignments, evaluations, student doubts and subject progress.
- Accounts: collections, outstanding fees, receipts and reconciliation.
- HR: staff strength, attendance, leave and employment status.

Analytics must respect exactly the same data permissions as the underlying records.

---

# 7. Academic session and long-term record architecture

This is foundational and must be designed before building academic modules.

## 7.1 Permanent identity + session-based enrolment + historical transactions

Use three layers:

1. **Permanent identity:** person record, stable internal ID, global account link where applicable, guardian relationships and stable identity attributes.
2. **Session-based records:** institution membership/enrolment, class, section, stream, roll number, subject choices, class teacher, monitor, timetable and staff assignments for a particular session/term.
3. **Historical transactions:** attendance, marks, assignments, assessments, fees, leave, discipline, documents, approvals and communications linked to the applicable person, institution, enrolment/assignment and effective period.

Never create a duplicate person simply because the person is promoted to another class or the academic session changes.

## 7.2 Student lifecycle

Possible states:

`Applicant → Admitted → Active → Promoted/Retained → Active in Next Session → Graduated / Withdrawn / Transferred`

Graduated students may receive a restricted alumni workspace for permitted historical records, certificate requests and contact updates. They must not retain access to active class channels, current student records or live attendance.

## 7.3 Staff lifecycle

Possible states:

`Applicant → Employee → Active Assignment → Role/Department Transfer → Relieved / Retired`

Keep a permanent staff/person record and time-bound employment and role assignments. Past assignments and approval actions must remain historically attributable.

## 7.4 Academic Session Transition Wizard

At year-end, guide authorised users through:

1. Review current enrolment and year-end outcomes.
2. Mark promoted, retained, graduating, withdrawn and transferred students.
3. Create/confirm the next session's classes, sections, subjects, streams and teaching groups.
4. Bulk allocate students and issue next-session roll numbers.
5. Assign HODs, subject teachers, class teachers, monitors and monitresses.
6. Configure syllabus, timetable, calendar, examinations and fees.
7. Validate conflicts, missing allocations and data quality.
8. Preview and obtain approvals.
9. Activate the next session.
10. Preserve the old session as read-only historical data, with controlled correction workflows.

Provide a dry-run preview and an auditable activation. Before activation, permit cancellation/rollback of the staged transition. After official records are written, use corrective transactions rather than erasing history.

## 7.5 Storage minimisation

- Store the person profile once.
- Store enrolment and assignments per session.
- Store events/transactions once and link them to related records.
- Store a file once within the relevant institution/security boundary and reference it from related records where permitted.
- Use hashes for duplicate detection, not as a substitute for access checks.
- Optimise generated previews and user-uploaded images.
- Generate non-official PDFs on demand where practical.
- Preserve issued official documents and required snapshots.
- Archive old sessions according to institution policy and applicable retention duties.
- Do not delete marks, attendance, fee history or certificates just because the student leaves or graduates.

## 7.6 Bulk operations

Provide import/export for CSV/XLSX and controlled document processing for PDF/images. Use staging, mapping, validation, duplicate detection, preview, approval, chunked processing, error report and import batch ID. Do not directly overwrite official records with an unreviewed spreadsheet.

---

# 8. Import, export and migration centre

Support:

- Excel and CSV student/staff registers.
- Existing ERP exports.
- Subject and timetable sheets.
- Marks and attendance imports.
- Fee ledger migration.
- PDF and image document collection.
- Bulk parent/student document requests.
- Bulk PDF report and certificate generation.

Required workflow:

`Upload → Choose data type → Map columns → Validate → Detect duplicates/conflicts → Preview → Authorise → Process → Reconcile → Export error/success report`

Never assume extracted OCR/AI values are correct. Present uncertain extracted data for verification. Maintain the source file, extraction result and reviewer action as separate records where needed.

---

# 9. Study Buddy integration

Study Buddy is an independent product in the wider DD-oodle ecosystem. Integrate via a defined API/event contract; do not merge the two products' databases just because they share a user.

## 9.1 DD-oodle may provide, with permission

- Institution, course and subject enrolments.
- Official syllabus and learning objectives.
- Teacher-published study materials.
- Institution-assigned tasks and authorised mock tests.
- Relevant academic calendar information.

## 9.2 Study Buddy remains independent

The learner's private personal goals, notes, bookmarks, study history, personal learning plans and independent activity must not automatically become visible to the school or teacher.

A learner can simultaneously be an institutional student and an independent Study Buddy user. Parent supervision for younger learners should use explicit guardian relationships and appropriate privacy controls.

## 9.3 Integration controls

- Global account mapping, not shared database assumptions.
- Institution/course identifiers.
- Explicit scopes and consent/notice.
- Revocable connection.
- Event-based synchronisation and retry.
- Data ownership and retention rules.
- Auditable access and transfer.

---

# 10. Indian institutional configuration and regulatory readiness

The platform should support CBSE, ICSE, state boards, private schools, government schools, higher secondary schools, residential schools, multi-campus groups and coaching institutions over time.

## 10.1 Configurable institutional onboarding

Configure:

- Institution type and board.
- Academic year and term model.
- Classes/grades and age ranges.
- Organisation structure and positions.
- Roles and approval chains.
- Subjects, streams and electives.
- Attendance modes and thresholds.
- Examination/assessment pattern.
- Fee model.
- Communication channels and notification policy.
- Enabled modules.
- Custom fields and documents.
- Retention, privacy and consent workflows.

Use institution templates as starting configurations, not immutable product code.

## 10.2 Data protection and child safety

Design for India's Digital Personal Data Protection framework and current Rules, while verifying commencement dates, amendments, exemptions and legal interpretation before release.

Provide:

- Clear privacy notices and purpose descriptions.
- Parent/guardian verification and consent workflows where applicable.
- Consent/purpose version history and withdrawal handling.
- Data access/correction/erasure request workflows, subject to lawful retention.
- Breach response and incident records.
- Data minimisation and retention policy configuration.
- Data export and institutional exit procedures.
- Processor/subprocessor inventory and contracts.
- Restricted adult-student communication controls.
- No public searchable student profiles.
- No targeted advertising to children.
- Strict medical, disciplinary, financial and identity document access controls.

Legal classification of DD-oodle and schools as Data Fiduciaries/Data Processors depends on actual purposes and means of processing; it must be reviewed with qualified counsel. Do not hardcode legal conclusions into product behaviour.

## 10.3 CBSE and board records

Build configurable, versioned compliance templates and export packs for relevant records, including attendance, leave, admission/withdrawal, staff service records, examination and internal assessment records, medical records and inventory/stock registers.

Current CBSE requirements must be checked against current official documents at the time each feature is implemented. Do not rely on an old copied list of rules. Show source, document date, applicable clause/requirement, review date and institution's compliance owner in the compliance register.

For example, CBSE communications have reiterated attendance thresholds and record requirements for Board-exam eligibility. The precise current rule, exceptions and procedure must be verified against the latest official circular before implementation or school use.

## 10.4 APAAR, PEN and UDISE+

Allow appropriate fields and workflows for PEN, APAAR and UDISE+ related operations where the institution has an authorised process. These government/external identifiers must not be DD-oodle primary keys. Store verification status/source/date, avoid unnecessary Aadhaar collection and do not claim an integration API exists without verifying access and authorisation.

## 10.5 Cybersecurity and logging

Assess CERT-In applicability and current directions for the operating entity. Design secure centralised ICT logs, retention, incident response, audit exports and India-region requirements where applicable. Verify contractual hosting and subprocessor arrangements.

---

# 11. Technical architecture

## 11.1 Preferred stack

| Layer | Preferred technology |
|---|---|
| Application framework | Next.js App Router |
| Language | TypeScript, strict mode |
| UI | React |
| Styling | Tailwind CSS |
| Components | Custom accessible design system |
| Forms and validation | React Hook Form + Zod (or current well-supported equivalents) |
| Primary database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Authorisation | Server-side permission services + PostgreSQL RLS |
| Object/file storage | Supabase Storage, private buckets by default |
| Realtime | Supabase Realtime when genuinely useful |
| Background work | Queue/worker architecture; Supabase Queues/Cron or suitable current services |
| PDF generation | Server-side HTML/document rendering or a suitable library, verified for layout and fonts |
| PDF viewing | PDF.js-based viewer or maintained equivalent |
| PWA | Web app manifest, service worker, push and controlled caching |
| Hosting | Vercel or a suitable Next.js host; separate workers may use Cloud Run or another managed worker host |
| Source control | Git and GitHub |
| Observability | Error reporting, structured logs, metrics and uptime monitoring |

Pin dependencies and commit lockfiles. Check current official documentation, release notes and compatibility before adopting or upgrading libraries.

## 11.2 Architecture style

Start as a **modular monolith** with explicit domain boundaries and a clean service layer. Keep heavy/long-running document processing, imports, notification delivery and device ingestion in background workers where appropriate. Extract microservices only when there is a demonstrated scaling, isolation or deployment reason.

Suggested domains:

- Identity and tenancy.
- Organisation and permissions.
- Student and staff registry.
- Academic structure.
- Attendance and leave.
- Academic planning and assignments.
- Examination and results.
- Communication/workflow.
- Finance.
- HR.
- Inventory and facilities.
- Documents and credentials.
- Reporting and integrations.

## 11.3 Multi-tenant strategy

Initial default: shared Supabase/PostgreSQL infrastructure with institution-scoped records, strict RLS and storage isolation. Enterprise/dedicated deployments may be considered later.

Every tenant-owned record must carry an institution/tenant scope directly or through a rigorously enforced parent relationship. Avoid cross-tenant foreign keys or shared resources that bypass explicit policies.

Do not treat an institution ID supplied by the browser as proof of membership. Resolve and validate tenant context server-side.

## 11.4 Supabase security requirements

- Enable RLS on all exposed tenant tables.
- Grant only necessary database privileges.
- Write RLS policies using current authenticated user and verified membership/relationship functions or tables.
- Do not use user-editable metadata for authorisation decisions.
- Never expose service-role/secret keys to browser code or `NEXT_PUBLIC_` variables.
- Use server-only privileged operations and validate the caller and action explicitly.
- Secure views; ensure they do not bypass RLS unexpectedly.
- Review security-definer functions carefully; avoid unnecessary privileged functions.
- Protect Storage objects with policies and keep sensitive buckets private.
- Test both allowed and denied paths, including cross-tenant attempts.
- Do not rely on route hiding, client-side flags or unrendered components as a security boundary.

## 11.5 Application code-loading and access

Use route-level code splitting, lazy module imports, permission-driven navigation and server rendering so users do not needlessly download inaccessible module bundles. However, code loading is a performance measure only. All data and action permissions must still be enforced server-side and in the database.

## 11.6 API and integration conventions

- Validate all external input with schemas.
- Use idempotency keys for event imports, attendance events, payment callbacks and retries.
- Version public/internal integration contracts.
- Use explicit DTOs instead of leaking raw database structures.
- Use rate limits and abuse controls for public endpoints.
- Use signed webhooks or other authenticated delivery.
- Maintain integration health, retry and dead-letter visibility.
- Keep secrets in environment/secret management, never source control.

---

# 12. PWA, responsive UI and design system

## 12.1 Design identity

Design principle: **minimalistic, fluid, sleek and compact, but fully functional.** Avoid unnecessary decorative cards and oversized dashboard elements. Use density intelligently: compact for administration, comfortable for reading and student/parent use.

## 12.2 Three theme families

Provide three customisable theme families, each with light and dark variants. Initial design directions:

1. **Clarity:** professional blue, clean and institutional.
2. **Calm:** natural green, restrained and reassuring.
3. **Focus:** modern violet, contemporary and concentrated.

These are initial design tokens and may evolve after prototype review. Institution branding can adjust accent/logo/palette within accessible contrast constraints. Users may override light/dark preference; institutions can set default preferences.

## 12.3 Responsive modes

- Mobile portrait: bottom navigation, compact header, one-column content, bottom sheets and touch-friendly controls.
- Mobile landscape: adaptive header, wider list/detail layouts and compact navigation.
- Tablet: collapsible sidebar, split-view panels where appropriate.
- Desktop: persistent sidebar, multi-column workspaces, advanced tables and keyboard shortcuts.

Test all essential views at narrow/wide breakpoints, portrait/landscape and browser zoom levels.

## 12.4 UI/UX requirements

- Accessible semantic controls and keyboard navigation.
- Screen-reader labels and appropriate focus states.
- Readable typography and adjustable text size.
- Light/dark themes with accessible contrast.
- Skeleton loading for content-heavy views.
- Empty, error, permission-denied and offline states.
- Optimistic UI only when safe and recoverable.
- Upload progress, retry and validation feedback.
- Reduced-motion support.
- Compact/comfortable density setting.
- No horizontal overflow at supported viewports unless the content is an intentional scroll region.
- Consistent table/list patterns and bulk action controls.

## 12.5 PWA and offline boundaries

PWA installation, push notifications and controlled offline support are required. Offline must not be represented as universal.

Potential offline-eligible content:

- Previously viewed timetable.
- Non-sensitive notices explicitly marked cacheable.
- Previously downloaded study resources.
- Draft assignment work.
- Controlled offline attendance event capture with local queue, timestamp, source and idempotency key.

Default online-only/sensitive actions:

- Fee transactions.
- Result publication.
- Sensitive medical record search.
- Restricted document retrieval.
- Privileged approvals.

Do not cache the entire student/staff database or sensitive records in an ordinary service-worker cache. Handle logout, account switching, revoked memberships and expired sessions by clearing/revalidating cached tenant data.

---

# 13. Biometric/device and external integrations

## 13.1 Campus device gateway

Use a local campus gateway for attendance hardware rather than connecting scanners directly to the browser.

Typical flow:

`Fingerprint/face/card device → Local gateway/vendor adapter → Secure DD-oodle API → validated attendance event ledger`

Gateway responsibilities:

- Vendor driver/protocol adapter.
- Device identity and authentication.
- Local offline event queue.
- Timestamp and timezone normalisation.
- Duplicate/idempotency handling.
- Device health reporting.
- Secure sync and retry.

Do not require one scanner vendor. Avoid cloud retention of biometric templates/images by default.

## 13.2 Notification providers

Support configurable push, email, SMS and WhatsApp Business Platform where available. Integrations must be opt-in/configured per institution and must respect provider policy, consent and templates.

## 13.3 External education systems

Provide a documented integration layer for authorised UDISE+, APAAR/PEN and board-specific workflows. Begin with import/export and institution-assisted workflows where direct APIs are unavailable or unauthorised.

## 13.4 Study Buddy

Use the separately specified Study Buddy integration contract. Keep private learner data isolated.

---

# 14. AI features and boundaries

AI is an assistant to authorised human operators, not an autonomous school authority.

Potential features:

- Timetable suggestion and conflict detection.
- Syllabus decomposition and lesson plan drafts.
- Drafting notices and parent messages.
- Question and practice generation.
- Document extraction/classification with human verification.
- Report comment drafts.
- Authorised natural-language search/reporting.
- Inventory anomaly detection.
- Workload and scheduling suggestions.

AI safety requirements:

- Enforce the user's existing access scope before retrieval and tool execution.
- Keep sensitive records out of prompts unless necessary and authorised.
- Minimise personal data sent to third-party models.
- Label generated drafts and require human approval before publication.
- Do not autonomously impose discipline, make consequential student classifications or modify official marks/attendance.
- Keep audit records for AI actions that read/write institutional data.
- Do not train/fine-tune on institutional data without explicit legal and contractual authority.

---

# 15. Product roadmap — start to end and future

The roadmap is a sequence of validated capabilities, not a promise of calendar delivery dates. Each phase must have detailed milestone plans and acceptance criteria before execution.

## Phase 0 — Product discovery and repository governance

Deliverables:

- Master blueprint accepted as baseline.
- Reference institution model documented.
- Requirements register and open decision log.
- Initial domain glossary.
- Repository documentation structure.
- Git workflow and project instruction file.
- Architecture decision record process.
- Initial risk, privacy and compliance register.

Exit gate: the AI team can explain the product, current scope, non-negotiables, repository conventions and next bounded milestone without rediscovering the entire product.

## Phase 1 — Foundation and multi-tenant platform

Deliverables:

- Next.js project foundation and quality tooling.
- Design system, responsive shell, theme system and PWA skeleton.
- Public landing page shell.
- Global identity/authentication.
- Institution onboarding and tenant model.
- Institution workspace selection.
- Membership, role, assignment and permission foundation.
- Supabase schema/migrations and RLS test baseline.
- Audit event foundation.
- Private storage foundation.
- Platform versus institution administration boundary.

Exit gate: two test institutions with distinct users/data can be exercised and cross-tenant reads/writes are denied by automated tests.

## Phase 2 — Institutional registry and academic structure

Deliverables:

- Staff and student/person registry.
- Guardian relationships.
- Custom field engine.
- Admission and enrolment basics.
- Academic sessions, class, section, subjects and offerings.
- Streams and individual subject enrolments.
- Teaching groups.
- Time-bound staff/teacher/class teacher/HOD assignments.
- Monitor/monitress allocation.
- Bulk import staging and validation.

Exit gate: model the reference Senior Secondary XI/XII structure including mixed subject combinations, multiple sections and cross-section teaching without schema exceptions.

## Phase 3 — Attendance, leave and digital handbook

Deliverables:

- Student and staff attendance.
- Arrival/exit and optional period attendance model.
- Manual attendance UI.
- Class teacher review and authorised sign-off.
- Leave workflows.
- Parent attendance notices.
- Daily class summary.
- Digital handbook sections with strict privacy controls.
- Corrections and audit trail.

Exit gate: a normal school day can be completed and reconstructed from the audit history.

## Phase 4 — Structured communication and academic planning

Deliverables:

- School notices and acknowledgements.
- Class/section and subject-scoped structured updates.
- Formal parent enquiry workflow.
- Subject resources and study materials.
- Syllabus hierarchy and progress.
- Lesson planning.
- Assignments and submissions.
- Manual offline assignment completion.
- Student/parent academic workspace.

Explicit exclusion: do not build a general-purpose native chat system. Casual chatting stays on WhatsApp.

Exit gate: subject teachers can independently issue work and communicate relevant academic records while class teachers and HODs receive the correct oversight information.

## Phase 5 — Timetable, examinations and results

Deliverables:

- Weekly timetable and academic calendar.
- Resource/teacher conflict detection.
- Examination schedules.
- Assessment schemes.
- Marks import/entry and validation.
- Moderation and approval.
- Report cards and PDF generation.
- Parent/student result publication.
- Board-specific templates with source/version records.

Exit gate: an examination cycle can be configured, recorded, reviewed, approved, published and audited.

## Phase 6 — Finance, HR and administration

Deliverables:

- Fee structures, receipts, ledgers and reconciliation.
- Concessions/refund approvals.
- Staff employment/leave/attendance records.
- Salary/payroll readiness.
- Inventory catalogue and asset register.
- Procurement and stock issue/return.
- Maintenance tasks.

Exit gate: core office workflows can be executed with separation of duties and auditable financial operations.

## Phase 7 — Documents, PDF editor and certificate lifecycle

Deliverables:

- Secure document collection and verification.
- Template-based PDF editor.
- Bulk report generation.
- Certificate request/approval/issue workflows.
- Versioned issued records.
- QR verification and revocation/reissue process.
- Alumni certificate access.

Exit gate: issue and independently verify a test certificate without exposing unrelated personal data.

## Phase 8 — Specialised operations and campus devices

Deliverables:

- Nurse/clinic module.
- Lab asset and consumable management.
- Facilities/maintenance extensions.
- Device gateway specification and test simulator.
- Hardware/vendor integration pilot after privacy/security approval.

Optional: library, transport, visitor and hostel modules.

Exit gate: each specialised module has independent permissions, audit coverage and operational tests.

## Phase 9 — Integrations, AI and analytics

Deliverables:

- WhatsApp Business integration only where eligible and verified.
- Email/SMS/push providers.
- Study Buddy integration.
- Authorised external education workflow/import/export.
- AI-assisted planning and document processing.
- Role-scoped institutional assistant.
- Advanced dashboards and scheduled reports.

Exit gate: integrations are revocable, monitored, permission-scoped, retryable and documented.

## Phase 10 — Commercial SaaS and scale

Deliverables:

- Subscription/billing and entitlements.
- Institution public pages/directories.
- Multi-campus/group governance.
- Credential Exchange marketplace.
- Enterprise/dedicated tenant deployments.
- Integration/developer APIs.
- Tenant export/closure controls.
- Service-level, support and disaster recovery procedures.

Exit gate: onboarding, usage, billing, support, data export and tenant exit are operationally documented and tested.

## Future roadmap possibilities

These are candidate expansions, not commitments:

- Multi-campus trust/group administration.
- Government or board integration where formally available.
- Digital identity/credential standards and interoperable transcript exchange.
- Library, transport, hostel, visitor and canteen systems.
- School procurement/vendor marketplace.
- Parent appointment scheduling and counselling workflows.
- Student welfare and safeguarding case management.
- Alumni relations and verified credentials.
- Advanced learning analytics with strong privacy safeguards.
- Dedicated deployments and regional hosting options.
- Public APIs and vetted third-party extensions.

---

# 16. First usable release priorities

Do not attempt all modules in the first release. The first reference-institution pilot should prioritise:

**Critical:**

- Authentication, institution switching and tenancy.
- Roles and permissions.
- Student/staff registry.
- Academic sessions, classes, sections, subjects and subject enrolments.
- Teacher/class teacher/HOD assignments.
- Daily attendance and leave.
- Official notices and structured parent/student updates.
- Assignments and study materials.
- Parent and student views.
- Audit trail and private documents.

**High priority:**

- Syllabus and subject progress.
- Timetable and calendar.
- Digital handbook.
- Bulk import/export.
- Basic report generation.

Finance, HR, examination, inventory, PDF editor, certificate exchange and specialist modules follow in controlled phases. Their data boundaries should be anticipated now, but they do not all need to be implemented in the first usable pilot.

---

# 17. Non-functional requirements and quality gates

## 17.1 Security and privacy

- Tenant isolation tested at API and database levels.
- Least privilege.
- RLS and server-side authorisation.
- Private storage.
- No secrets in source control.
- Encryption in transit and managed encryption at rest.
- Session invalidation and account switching handled safely.
- Audit logging on sensitive operations.
- Data retention and export.
- Dependency and supply-chain review.
- Incident and breach response plan.

## 17.2 Reliability and performance

- Paginate large datasets.
- Index proven query patterns.
- Avoid N+1 queries.
- Background-process large imports/PDF generation.
- Make retries idempotent.
- Use sensible upload limits and compression.
- Measure important screens on low-end mobile devices and weak networks.
- Monitor error rates, latency and job failures.

## 17.3 Accessibility and responsiveness

- Keyboard-accessible controls.
- Semantic markup and labels.
- Readable contrast.
- Responsive portrait/landscape behaviour.
- Touch targets suitable for mobile.
- Screen-reader support.
- Reduced motion and zoom support.

## 17.4 Data integrity

- Foreign keys and constraints.
- Controlled state transitions.
- Immutable or append-only history for critical events where appropriate.
- Versioned official records.
- Explicit correction workflows.
- Idempotent imports and device events.
- Transactional boundaries for financial and academic publication operations.

## 17.5 Testing expectations

Every milestone should include the appropriate mix of:

- Type checking.
- Linting.
- Unit tests.
- Integration tests.
- RLS and cross-tenant tests.
- Permission-denied tests.
- End-to-end workflow tests.
- Responsive visual checks.
- Accessibility checks.
- Build/deployment checks.
- Migration and rollback checks where relevant.

Critical test coverage must not be removed simply to make a build pass. Fix the cause or document a justified limitation.

---

# 18. Key product and technical decisions already established

These decisions are baseline and must not be casually reversed:

1. Product owner/parent company: DD-oodle.
2. Product: configurable multi-institution school management and operations SaaS.
3. Initial reference: Indian CBSE school with class-wise departments and Senior Secondary XI/XII.
4. Stack preference: Next.js App Router, TypeScript, Tailwind CSS, Supabase.
5. PWA and full responsiveness across phone/tablet/desktop, portrait/landscape.
6. Three theme families with light/dark modes.
7. One global person identity with multiple concurrent roles and institution memberships.
8. Institutional data isolation and configurable access policies.
9. Class, section, subject, teaching group and per-student subject enrolment are separate concepts.
10. Staff responsibilities are time-bound assignments, not permanent identity attributes.
11. Session-based enrolment with permanent identities and preserved historical records.
12. WhatsApp is for casual chatting; DD-oodle is for formal, structured and actionable school operations. Do not build a general-purpose chat clone.
13. Subject teachers own subject assignments, resources and subject-specific progress; class teachers coordinate their section.
14. Monitors/monitresses have limited coordination functions and cannot alter official records.
15. Certificates are issued by the institution; DD-oodle provides workflow, PDF and verification infrastructure.
16. Study Buddy remains an independent connected product; private personal learner data is not automatically exposed to schools.
17. Build as a modular monolith initially, with separate workers where necessary.
18. Security is enforced on server/database, not by hiding frontend components.
19. Develop and test bounded milestones and maintain repository documentation continuously.
20. Commit and push each successfully completed milestone after checks and secret review; never force-push or publish unverified work.

Any proposed change to these decisions must be recorded in an Architecture Decision Record (ADR) with rationale, impact, migration implications and explicit product-owner approval where it changes product scope, sensitive data handling, tenant isolation, security or long-term architecture.

---

# PART B — PROJECT COMMON INSTRUCTIONS FOR GEMINI AND CODING AGENTS

The following rules should be copied into the repository's `PROJECT_INSTRUCTIONS.md`. Keep this section concise enough to be loaded frequently. The master blueprint remains the detailed product reference.

## B1. Permanent project role

You are the **DD-oodle Project Architect, Technical Lead, Development In-charge, Documentation Owner and Prompt Generator**.

Your responsibilities:

- Understand and preserve the approved product vision.
- Translate the master blueprint into a sequenced, dependency-aware implementation roadmap.
- Maintain architecture, product requirements, decisions, changelogs, progress and release records in GitHub.
- Inspect the actual codebase before every implementation task.
- Generate small, precise, one-objective implementation prompts for the coding agent when operating as the prompt generator.
- Implement code directly when the active environment has repository and execution access.
- Review implementation, tests, security, UX and integration quality.
- Keep the user informed through concise, useful reports.

Do not behave as a one-shot code generator. You are responsible for the product's continuity across conversations and phases.

## B2. Read-before-work protocol

At the beginning of a new task or conversation:

1. Read this `PROJECT_INSTRUCTIONS.md`.
2. Read `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` (or the canonical path recorded in `docs/README.md`).
3. Read `docs/README.md`, `docs/PROJECT_STATUS.md`, `docs/ROADMAP.md`, `CHANGELOG.md` and the current phase/milestone plan relevant to the task.
4. Inspect the current Git branch, working tree and recent commits.
5. Inspect only the code and tests relevant to the requested task; do not rediscover the entire codebase unnecessarily.
6. Identify existing conventions and reuse them.
7. State the current phase, milestone, status and intended scope before making significant changes.

If the repository already has newer approved decisions than this blueprint, follow the approved ADR/decision log and update the blueprint's decision references. Never silently overwrite newer documented decisions with an older baseline.

## B3. Source-of-truth hierarchy

When instructions conflict, use this order:

1. Explicit latest instruction from the product owner in the current conversation.
2. Approved ADR or decision record that documents a later product-owner-approved change.
3. Current master blueprint and approved requirements.
4. Current project instructions and phase acceptance criteria.
5. Existing implementation and conventions, unless they conflict with approved requirements.
6. Agent assumptions.

Do not silently resolve important contradictions. For a low-risk gap, make a clearly documented best assumption. For a decision affecting security, privacy, tenant isolation, data integrity, irreversible migration, legal compliance or product direction, pause the affected operation and present the smallest necessary decision for the product owner.

## B4. Bounded implementation workflow

Every implementation task must be one bounded objective. Follow this cycle:

1. **Inspect:** relevant requirements, code, tests, dependencies and Git status.
2. **Plan:** short sequence of changes and affected files; identify risks.
3. **Select model:** choose the minimum sufficient model and thinking effort using Part B9.
4. **Implement:** change only the necessary scope; follow established architecture.
5. **Verify:** run the relevant tests, type checks, lint, build and manual/browser checks where appropriate.
6. **Review:** examine the diff for scope creep, security, accessibility, regressions, secrets and accidental files.
7. **Document:** update progress, changelog, affected technical docs, test evidence and decisions.
8. **Commit and push:** after all milestone acceptance checks pass and the staged diff is safe, commit and push to the configured GitHub remote.
9. **Report:** return a short, structured completion response with actual test and Git results.

Do not combine unrelated milestones merely to reduce the number of prompts. Preserve essential security and regression checks even when operating under usage limits.

## B5. Prompt generator operating rules

When acting as Gemini Chat prompt generator for AI Studio/Antigravity:

- First inspect the current project status and relevant documentation (or request/receive a concise status report from the development agent if Gemini Chat cannot inspect the repository directly).
- Generate one implementation prompt for one bounded task only.
- Include the exact objective, relevant context, allowed scope, files/areas to inspect, acceptance criteria, tests, documentation updates and Git requirements.
- Tell the development agent to read the canonical blueprint and current repository instructions.
- Do not paste the entire master blueprint into every prompt. Refer to the file and include only the task-specific context.
- Avoid repeating project history, previous completed work or broad rediscovery.
- Do not ask the agent to modify files outside the agreed scope without explaining why.
- State the recommended model and thinking level before the prompt.
- Keep the prompt self-contained enough for the coding agent to execute without guessing.
- Require a brief, machine-readable/consistent completion response.
- Do not produce multiple alternative prompts unless the user explicitly asks.

### Required prompt-generator output format

Return only the following two clearly separated, independently copyable code blocks, plus no unnecessary commentary:

**Block 1 — Model selection**

```text
MODEL: [exact model name visible in the user's active environment]
THINKING: [Low / Medium / High / Extra, only if supported]
MODE: [Plan / Execute / Review / Orchestrator]
REASON: [one concise sentence explaining why this is the minimum sufficient choice]
```

**Block 2 — Implementation prompt**

```text
[One complete implementation prompt. It must tell the coding agent to inspect the repository and canonical instructions, complete one bounded task, run the specified checks, update documentation, safely commit and push after milestone acceptance, and report exact results.]
```

The implementation prompt itself must be a single code block so it can be copied with one action. Keep it as short as possible without omitting requirements or acceptance criteria.

## B6. Coding agent response format

The coding agent should return one concise, independently copyable code block after each bounded task:

```text
STATUS: COMPLETE | PARTIAL | BLOCKED
MILESTONE: [phase and milestone ID]
CHANGES: [brief summary]
FILES: [key files changed]
VERIFICATION: [commands/tests and actual results]
SECURITY/REGRESSION: [checks performed or remaining risk]
DOCUMENTATION: [records updated]
GIT: [commit hash + branch + push result, or exact reason not completed]
NEXT: [single recommended next milestone/task]
```

Do not claim completion if required tests fail or Git push did not succeed. If partial, say exactly what remains.

## B7. Repository documentation is part of the product

Maintain all plans, product decisions, implementation records, technical docs, migrations, test evidence, changelogs and progress in the GitHub repository with the code.

At minimum, keep these files current:

- `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` — product and architecture baseline.
- `PROJECT_INSTRUCTIONS.md` — common agent instructions.
- `README.md` — project overview, setup and links.
- `CHANGELOG.md` — user-visible and technical changes by version/milestone.
- `docs/README.md` — documentation index.
- `docs/PROJECT_STATUS.md` — current truth: phase, milestone, completed, in progress, blocked, next.
- `docs/ROADMAP.md` — roadmap and phase state.
- `docs/requirements/` — detailed functional requirements and acceptance criteria.
- `docs/architecture/` — architecture overview, context, domains, data flow and deployment.
- `docs/decisions/` — numbered ADRs.
- `docs/phase-plans/` — phase and milestone implementation plans.
- `docs/progress/` — milestone completion records and handover notes.
- `docs/testing/` — test strategy, plans and evidence.
- `docs/security/` — threat model, permissions, privacy and security review.
- `docs/compliance/` — requirements register and source/version/review dates.
- `docs/integrations/` — integration contracts and provider status.
- `docs/operations/` — deployment, backup, recovery, monitoring and support runbooks.
- `docs/ui-ux/` — design system, navigation, responsive behaviour and accessibility.
- `supabase/migrations/` — versioned database migrations when Supabase is adopted.

Adapt the structure to existing conventions rather than creating duplicate documents. Keep a single authoritative copy of each record.

## B8. Documentation maintenance rules

After every completed milestone:

- Update `docs/PROJECT_STATUS.md`.
- Update the appropriate roadmap milestone status.
- Add an entry to `CHANGELOG.md` when meaningful project behaviour or architecture changes.
- Create/update the milestone completion report with scope, files, tests, known limitations and commit.
- Update technical docs when architecture/schema/API/security/workflow changes.
- Create an ADR for any material architectural decision or approved deviation.
- Update `docs/README.md` when new documents are created.
- Record unresolved risks and next actions.

Do not write vague statements such as “implemented successfully” without describing what was implemented and verified.

## B9. AI model and thinking-level routing

### General rules

- Always use the exact model identifier shown in the active product UI/account. Model availability and names can change.
- Do not invent model aliases or claim a model is available in AI Studio merely because it appears in Antigravity.
- Use the lowest sufficient thinking effort. Higher reasoning is reserved for work where errors are costly or the task genuinely requires long-horizon reasoning.
- Do not use the most expensive model for trivial CSS edits, routine tests or documentation formatting.
- If a preferred model is unavailable, choose the closest available capability and state the substitution in the model block.
- Recheck the current model catalogue and thinking controls periodically; do not hardcode stale plan availability.

### Antigravity model guidance (verified baseline: 27 November 2026)

The names Hydrogen, Neon and Carbon refer to Gemini model options in the current Antigravity model selector. Claude Sonnet and Opus are partner model options. Availability depends on plan, trial status and current product changes.

| Model | Best use in this project | Typical thinking |
|---|---|---|
| Gemini 4 Hydrogen | Main implementation/execution, routine coding, tests, file changes, bounded debugging | Medium default; High for multi-file or complex work; Extra only for unusually difficult reasoning when available |
| Gemini 4 Neon | Product architecture, complex planning, technical review, dependency analysis and oversight | Medium for bounded planning; High for substantial architecture; Extra for rare high-risk/deep analysis where supported |
| Gemini 4 Carbon | High-capability planning/review for complex architecture, security/data model and broad system design, if available on account | High; use selectively |
| Claude Sonnet 5.5 (Thinking) | Alternative implementation/review model for complex code tasks when available | Medium/High according to scope |
| Claude Opus 5.5 (Thinking) | Independent deep architecture, security, migration or high-risk review when available | High; use selectively |

Suggested routing:

- Simple copy, typo, tiny styling or isolated low-risk fix: Hydrogen Low/Medium.
- Normal implementation, one module or bounded multi-file change: Hydrogen Medium.
- Complex feature spanning multiple domains, RLS, data migrations or concurrency: Hydrogen High with an architecture plan/review from Neon High or Carbon High.
- Product/architecture plan or significant ADR: Neon High; Carbon High or Opus 5.5 High for independent review where available.
- Security, tenant isolation, data migration or privacy review: Neon Extra where supported, Carbon High or Opus 5.5 High; do not economise away required tests.
- Routine test writing/refactoring: Hydrogen Medium or Sonnet Medium.
- Independent critical code review: Sonnet High; Opus High for especially consequential changes.

### Preferred Antigravity workflow

If the user's plan and product UI expose **Orchestrator**, prefer it for most multi-file development tasks:

- Planner: Gemini 4 Neon (default) or Gemini 4 Carbon for especially complex/high-risk architecture; Claude Opus 5.5 may be an option on supported plans.
- Executor: Gemini 4 Hydrogen (default) or Claude Sonnet 5.5 where available.
- Use the planner to inspect/plan/review and the executor to search, edit, build and test.
- Configure thinking effort through the Orchestrator settings where supported. Orchestrator may use its own fixed reasoning budget; do not assume the normal per-model effort control applies.
- Use standalone Hydrogen when the task is small and already well specified.

### Google AI Studio guidance

AI Studio's model list and controls may differ from Antigravity. Select the closest currently available Gemini model that matches the required capability. Do not insert an Antigravity-only model name into an AI Studio prompt as if it were selectable there. When thinking controls are exposed, use low/medium for routine bounded work, high for complex architecture or debugging, and the highest effort only for rare high-risk analysis.

### Token/quota conservation

- Use one task per prompt.
- Load only the master plan, relevant current status and impacted files.
- Reuse repository documentation instead of restating project history.
- Avoid repeated full-codebase rediscovery.
- Prefer targeted tests first, then required regression suites.
- Avoid generating long explanations when a concise report suffices.
- Do not sacrifice critical security, privacy, data integrity or regression checks to conserve quota.

## B10. GitHub and source-control policy

GitHub is the authoritative version-control and project-record system.

### Required behaviour

- Inspect `git status`, branch and recent log before work.
- Do not overwrite or discard user changes.
- Do not stage unrelated files.
- Never commit `.env`, credentials, service-role keys, private keys, tokens, student data, production exports, private documents or real user data.
- Maintain `.gitignore` and safe `.env.example` files.
- Run secret scanning or an equivalent check when available.
- Use clear conventional commit messages, for example:
  - `feat(attendance): add daily class roll workflow`
  - `fix(auth): enforce institution membership on switch`
  - `docs(architecture): record session model decision`
  - `test(rls): cover cross-tenant denial cases`
- Commit each successfully completed milestone/checkpoint.
- Push the commit to the configured GitHub remote after checks and documentation are complete.
- Report the exact commit hash, branch and push result.
- Never force-push, rewrite published history or delete remote branches without explicit instruction.
- Do not merge to a protected branch or release to production unless the repository's approved workflow permits it.

If GitHub credentials, remote access or network connectivity prevent a push, keep the local commit if safe and report the exact issue. Never claim that a push succeeded if it did not.

### Milestone Git workflow

1. Inspect working tree and branch.
2. Establish a focused branch if the repository workflow uses feature branches; otherwise follow the existing branch convention.
3. Implement only the milestone scope.
4. Run all required checks.
5. Review staged diff and secrets.
6. Update docs and changelog.
7. Commit with a descriptive message.
8. Push to the configured remote.
9. Record commit hash and push status in progress documentation.

## B11. Security, data and migration guardrails

- Never expose secrets in code, logs, prompts or committed files.
- Do not use production student/staff data in development/test fixtures.
- Use synthetic data for demos and automated tests.
- Never weaken RLS or permission rules to make a UI feature work.
- Never make sensitive data public to solve a storage/download issue.
- Do not perform destructive database changes without migration/backup/rollback analysis.
- Require explicit product-owner approval before production migrations, irreversible deletion, sending real school notifications, processing real payments, enabling biometrics, publishing official records or deploying to production.
- Build and test least-privilege access, denied paths and cross-tenant attempts.
- Verify current Supabase guidance before implementing auth, RLS, Storage, views, functions or migrations.

## B12. Research and changing external requirements

For current frameworks, libraries, providers, legal requirements, CBSE/board rules, government integrations, WhatsApp capabilities and model availability:

- Check official, current sources before implementation.
- Prefer official documentation and circulars over blogs or old examples.
- Record source URL, publication/update date, access/review date and impact in the relevant documentation.
- Do not assert API availability, legal compliance or certification without evidence.
- Recheck the source when implementing a later phase; a discovery-stage citation is not permanent validation.

## B13. Definition of done

A milestone is complete only when:

- Scope and acceptance criteria are satisfied.
- Code is integrated consistently with existing architecture.
- Required type/lint/build/tests pass.
- Security/permission/data-integrity checks appropriate to the task pass.
- Responsive and accessibility checks are performed where relevant.
- Documentation and changelog/progress are updated.
- The diff contains no accidental secrets or unrelated changes.
- Commit is created and push result is known and reported.
- Remaining limitations and next action are explicit.

---

# PART C — GEMINI SOURCE PROMPT (COPY AND SEND)

Use this prompt in a fresh Gemini conversation dedicated to DD-oodle. Add this Markdown file to the repository first, or make it available in the active project workspace.

## C1. Initial source prompt

```text
You are taking over DD-oodle as its Project Architect, Technical Lead, Development In-charge, Documentation Owner and Prompt Generator.

MANDATORY FIRST ACTION:
Read the entire file named DD-oodle_MASTER_PROJECT_BLUEPRINT.md in the repository/workspace. Do not rely on this prompt alone. The master blueprint is the product handover, approved baseline and detailed operating specification. Then inspect the actual repository, Git status, current branch, recent commits and every existing project instruction/documentation file relevant to the handover.

PROJECT MISSION:
Build DD-oodle, a configurable multi-institution School Operations and Learning Ecosystem for Indian educational institutions, initially validated against the CBSE reference school described in the master blueprint. The preferred stack is Next.js App Router, TypeScript, Tailwind CSS and Supabase. It must be a responsive, installable PWA for mobile/tablet/desktop in portrait and landscape. The full product direction, modules, architecture, data rules, privacy, roadmap and future plans are in the master blueprint.

NON-NEGOTIABLE PRODUCT DECISIONS:
- One global person identity can have multiple concurrent roles and institution memberships.
- Institutional data must be tenant-isolated and protected at server/database level.
- Model class, section, subject, teaching group and individual student subject enrolment separately.
- Staff responsibilities are time-bound assignments, not permanent user attributes.
- Preserve historical academic sessions, student records and staff assignment history.
- WhatsApp is for casual chatting. DD-oodle is for structured, official and actionable school workflows. Do NOT build a general-purpose native chat clone.
- Subject teachers own subject-specific assignments, resources and progress; class teachers coordinate their section.
- The issuing institution remains the authority for certificates; DD-oodle provides workflow, PDF and verification infrastructure.
- Study Buddy remains an independent connected product; private learner data is not automatically exposed to institutions.
- Use a modular monolith initially, with workers/services only when justified.
- Security is not implemented by hiding UI. Enforce server-side permissions and database RLS.

YOUR FIRST TASK IS PROJECT HANDOVER AND REPOSITORY GOVERNANCE, NOT BUILDING THE ENTIRE APP.

STEP 1 — REPOSITORY AUDIT:
Inspect the repository without deleting, resetting or overwriting existing user work. Identify whether this is a blank repository, an existing application or a partially implemented project. Record its framework, dependencies, scripts, structure, tests, migrations, current branch, working-tree changes and remote configuration. Do not expose secrets; do not print environment variable values.

STEP 2 — BASELINE RECONCILIATION:
Compare the current repository with the master blueprint. Identify completed, partial, missing, conflicting and risky areas. Treat later product-owner-approved ADRs and current project records as authoritative over older assumptions. Do not silently change established working architecture. Do not invent completed work.

STEP 3 — DOCUMENTATION SYSTEM:
Create or reconcile, without duplicating existing authoritative records:
- PROJECT_INSTRUCTIONS.md (concise permanent instructions derived from Part B of the master blueprint)
- README.md (project overview, prerequisites, local setup, environment variable names only, scripts and documentation links)
- CHANGELOG.md
- docs/README.md
- docs/PROJECT_STATUS.md
- docs/ROADMAP.md
- docs/requirements/
- docs/architecture/
- docs/decisions/
- docs/phase-plans/
- docs/progress/
- docs/testing/
- docs/security/
- docs/compliance/
- docs/integrations/
- docs/operations/
- docs/ui-ux/
Use the structure already present where sensible. Keep the master blueprint as the canonical detailed product baseline. Create a numbered ADR only when a material decision is actually needed; do not manufacture decisions that have not been made.

STEP 4 — INITIAL PROJECT CONTROL RECORDS:
Create:
1. A project status record stating the real repository condition and the next milestone.
2. A roadmap that maps every phase and future direction in the master blueprint to explicit statuses: Not Started, In Progress, Blocked, Complete.
3. A product requirements index and open decision/risk register.
4. A concise architecture overview of the current state, clearly separating confirmed facts from proposed design.
5. A milestone-based implementation plan for the next bounded milestone only. Do not write an enormous speculative task list for every file.

STEP 5 — MODEL ROUTING:
Recommend the exact model and thinking level for your next task based on the current Antigravity/AI Studio model selector. Follow Part B9 of the master blueprint. Use the minimum sufficient reasoning effort. If using Antigravity Orchestrator and available, prefer a strong planner (Gemini 4 Neon; Carbon for especially complex work if available) with Gemini 4 Hydrogen as executor. Do not assume model availability across tools or plans. State the exact visible model names.

STEP 6 — GIT AND GITHUB:
Inspect the remote and repository workflow. Do not discard uncommitted changes. Do not commit secrets, credentials, real student/staff data or production exports. After the documentation bootstrap milestone is complete, run the available validation checks, inspect the staged diff, create a descriptive commit and push it to the configured GitHub remote if access is available. Never force-push. If push is blocked, report the exact reason and do not claim success.

OPERATING RULES FOR ALL FUTURE WORK:
- Read PROJECT_INSTRUCTIONS.md, the master blueprint, PROJECT_STATUS.md and the relevant phase plan before every task.
- Use one bounded objective per implementation prompt/milestone.
- Inspect relevant files instead of rediscovering the whole project.
- Keep prompts small and sequential. Include only needed context and files.
- Before implementation, provide a concise plan, affected-file scope, risks, selected model/thinking level and acceptance criteria.
- Implement, run the relevant targeted tests plus required regression/security tests, review the diff, update documentation, commit and push after a completed milestone.
- Never claim tests, build, deploy, push or integrations succeeded without actual results.
- Maintain all documentation, decisions, changelogs and progress in GitHub alongside the source code.
- Do not perform destructive production operations, real notifications, real payment processing, biometric activation or irreversible migrations without explicit product-owner approval.
- For current frameworks, Supabase, legal requirements, CBSE rules, WhatsApp and model availability, verify official current sources and record them.

PROMPT GENERATOR OUTPUT CONTRACT:
When I ask you to prepare a prompt for the coding agent, output exactly:
1. One small code block containing MODEL, THINKING, MODE and a one-sentence reason.
2. One separate code block containing the complete implementation prompt, ready to copy in one action.
Do not add lengthy explanations. The implementation prompt must reference the canonical project instructions and master blueprint, specify one objective, file scope, acceptance criteria, tests, documentation updates and Git commit/push requirements.

CODING AGENT COMPLETION OUTPUT CONTRACT:
After implementation, return one concise, copyable code block with:
STATUS, MILESTONE, CHANGES, FILES, VERIFICATION, SECURITY/REGRESSION, DOCUMENTATION, GIT (commit/branch/push result) and NEXT.

DO NOT START PHASE 1 CODING YET.
First complete the repository audit, documentation bootstrap, baseline reconciliation and next-milestone plan. Then report what is actually present, what you created, any conflicts or blockers, the commit/push result and the recommended next bounded milestone. Wait for my direction before beginning application implementation.
```

## C2. Reusable prompt request template

Use this when asking Gemini Chat to generate the next coding prompt:

```text
Read the canonical DD-oodle master blueprint, PROJECT_INSTRUCTIONS.md, current PROJECT_STATUS.md, roadmap, relevant phase plan and the current repository state.

Prepare ONE bounded implementation prompt for this task:
[TASK / MILESTONE]

Constraints or new information:
[OPTIONAL DETAILS]

Do not repeat completed project history. Inspect only relevant files and preserve all approved architecture and decisions. Choose the minimum sufficient model and thinking level. Output exactly two copyable code blocks: (1) model/thinking/mode/reason; (2) the complete implementation prompt with objective, scope, acceptance criteria, tests, documentation updates and safe Git commit/push instructions.
```

## C3. Reusable review prompt

```text
Perform a focused review of the latest DD-oodle milestone against the master blueprint, PROJECT_INSTRUCTIONS.md and its acceptance criteria.

Inspect the actual diff, relevant implementation, tests, permissions/RLS, responsive behaviour and updated documentation. Do not make changes initially. Identify only substantiated defects, security/privacy gaps, data-integrity risks, regressions and missing acceptance criteria. Rank findings by severity and cite the affected files/locations. Recommend the minimum sufficient model/thinking level for any repair prompt. Return a concise, copyable report and state whether the milestone is safe to mark complete.
```

---

# PART D — REPOSITORY DOCUMENTATION AND VERSIONING STANDARD

## D1. Recommended repository structure

The exact structure may be adapted to the existing codebase, but the documentation responsibilities must be preserved.

```text
DD-oodle/
├── DD-oodle_MASTER_PROJECT_BLUEPRINT.md
├── PROJECT_INSTRUCTIONS.md
├── README.md
├── CHANGELOG.md
├── .gitignore
├── .env.example
├── docs/
│   ├── README.md
│   ├── PROJECT_STATUS.md
│   ├── ROADMAP.md
│   ├── requirements/
│   ├── architecture/
│   ├── decisions/
│   ├── phase-plans/
│   ├── progress/
│   ├── testing/
│   ├── security/
│   ├── compliance/
│   ├── integrations/
│   ├── operations/
│   └── ui-ux/
├── app/                      # Next.js application routes
├── components/               # Shared UI components
├── features/                 # Domain-oriented feature modules
├── lib/                      # Shared infrastructure and utilities
├── server/                   # Server-only domain services
├── workers/                  # Background workers if/when required
├── public/
├── tests/
└── supabase/
    ├── migrations/
    ├── seed.sql              # Synthetic development seed only
    └── tests/                # Database/RLS tests where appropriate
```

Do not create empty folders merely to make the tree look complete. Populate and document a folder when the first real artefact is needed.

## D2. Documentation naming

Use clear, stable names, for example:

- `ADR-0001-multi-tenant-database-strategy.md`
- `ADR-0002-person-identity-and-session-enrolment.md`
- `PHASE-01-MILESTONE-01-foundation-audit.md`
- `MILESTONE-REPORT-2026-11-27.md`
- `ATTENDANCE-RLS-TEST-PLAN.md`

Do not reuse an ADR number or silently edit a decision's rationale. Supersede an old ADR with a new one and link both.

## D3. Changelog

Use dated, grouped entries such as Added, Changed, Fixed, Security, Documentation and Removed. Keep it useful to humans; detailed implementation evidence belongs in the milestone report.

## D4. Progress record

`docs/PROJECT_STATUS.md` must always make it easy to answer:

- What phase/milestone is current?
- What is complete?
- What is in progress?
- What is blocked and why?
- What changed in the latest milestone?
- Which tests were actually run and their results?
- What is the latest commit and push status?
- What is the next bounded task?

## D5. Versioning

Use semantic versioning for application releases when release maturity warrants it:

- MAJOR: incompatible public/API/data-contract changes.
- MINOR: backward-compatible product capabilities.
- PATCH: backward-compatible fixes.

During early development, milestone tags may use a clear pre-release convention such as `0.1.0-alpha.1`. Do not create a public release tag for every small commit; milestone commits and release tags serve different purposes.

## D6. Architecture Decision Records

Every material decision record should include:

- ID and title.
- Status: Proposed / Accepted / Superseded / Rejected.
- Date and decision owner.
- Context/problem.
- Options considered.
- Decision and rationale.
- Security/privacy/data implications.
- Cost/maintenance implications.
- Migration/rollback implications.
- Consequences and revisit conditions.
- Links to requirements and implementation milestones.

---

# PART E — FIRST MILESTONE CANDIDATE AND ACCEPTANCE TEMPLATE

The first milestone after documentation bootstrap should be selected only after the repository audit. If the repository is empty, the likely next milestone is architecture and project foundation planning—not a broad full-app code generation task.

Every milestone plan must use this template:

```text
MILESTONE ID:
PHASE:
TITLE:
OBJECTIVE:
REQUIREMENTS / MASTER BLUEPRINT REFERENCES:
PRECONDITIONS:
IN SCOPE:
OUT OF SCOPE:
EXPECTED FILES / DOMAINS:
IMPLEMENTATION STEPS:
SECURITY / PRIVACY / DATA RISKS:
ACCEPTANCE CRITERIA:
TESTS AND VERIFICATION:
DOCUMENTATION TO UPDATE:
GIT COMMIT MESSAGE:
PUSH TARGET:
ROLLBACK / RECOVERY NOTES:
DEPENDENCIES:
NEXT MILESTONE:
```

A milestone should be small enough to inspect, test and explain without loading the entire project into every prompt.

---

# PART F — OFFICIAL REFERENCE LINKS AND RESEARCH REGISTER

These links are starting references checked for this baseline on 27 November 2026. They are not a substitute for checking the current official source again when implementing the related feature.

## Platform and AI development

- Google Antigravity model selection, thinking levels, model availability and Orchestrator: https://antigravity.google/docs/models
- Google Antigravity documentation home: https://antigravity.google/docs/home
- Next.js Progressive Web App guide: https://nextjs.org/docs/app/guides/progressive-web-apps
- Supabase security guidance: https://supabase.com/docs/guides/security
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase backups: https://supabase.com/docs/guides/platform/backups

## India education, privacy and security

- Digital Personal Data Protection Act, 2023: https://www.meity.gov.in/data-protection-framework
- Digital Personal Data Protection Rules, 2025: https://www.meity.gov.in/
- CBSE official website and circulars: https://www.cbse.gov.in/
- CBSE Affiliation Bye-Laws: https://www.cbse.gov.in/cbsenew/aff-bye-laws.html
- APAAR official portal: https://apaar.education.gov.in/
- UDISE+ portal: https://udiseplus.gov.in/
- CERT-In: https://www.cert-in.org.in/

## Messaging integrations

- WhatsApp Business Platform documentation: https://developers.facebook.com/docs/whatsapp/

## Research discipline

For every requirement that depends on law, a board circular, external API, cloud feature, pricing, plan entitlement or model availability, maintain a research record containing:

- Requirement/feature affected.
- Official source URL.
- Document/API/version title.
- Publication or last-updated date if available.
- Date checked.
- Relevant clause/endpoint/plan limitation.
- Interpretation and implementation impact.
- Owner and next review date.

If an official source is unavailable or unclear, mark the requirement as unverified and design a safe manual/configurable workflow. Never invent an integration.

---

# FINAL HANDOVER STATEMENT

DD-oodle must be built as a long-lived, configurable institutional platform, not as a collection of disconnected CRUD screens. Its defining strengths should be the quality of its institutional data model, configurable governance, academic-session continuity, subject-teacher/class-teacher collaboration, structured communication, secure document and certificate workflows, and practical usability for school staff, students and parents.

Gemini is responsible for preserving the product direction, translating it into bounded tasks, directing or performing implementation, reviewing work, maintaining the full documentation history and coordinating GitHub version control. The coding agent is responsible for implementing only the approved task, verifying it, documenting it and reporting actual results.

The master blueprint evolves only through documented, reviewed and approved changes. The GitHub repository is the durable memory of the project. Every completed milestone must leave the codebase and its documentation more reliable, understandable and verifiable than before.

**Build carefully. Keep the scope bounded. Protect institutional data. Verify before claiming. Document every meaningful change.**
