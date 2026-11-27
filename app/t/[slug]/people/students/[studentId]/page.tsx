import Link from "next/link";
import {
  linkGuardianAction,
  updateStudentLifecycleAction,
  upsertCustomFieldValueAction,
} from "@/app/t/[slug]/people/actions";
import { PeopleSubNav } from "@/components/registry/PeopleSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { evaluatePermission } from "@/lib/auth/permissions";
import {
  GUARDIAN_RELATIONSHIPS,
  STUDENT_LIFECYCLE_STATUSES,
} from "@/lib/registry/schemas";
import { getStudentDetail } from "@/server/registry/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface StudentDetailPageProps {
  params: Promise<{ slug: string; studentId: string }>;
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const { slug, studentId } = await params;
  const resolution = await resolveVerifiedTenantContext(slug);

  if (resolution.status !== "ok") {
    return (
      <StateNotice
        kind="permission-denied"
        title="Workspace verification required"
        description="Server-side membership verification did not succeed."
      />
    );
  }

  const { context } = resolution;
  const canManagePeople = evaluatePermission(context, {
    permission: "people.manage",
  }).allowed;
  const canWriteSensitive = evaluatePermission(context, {
    permission: "people.sensitive.write",
  }).allowed;
  const canViewStaff =
    evaluatePermission(context, { permission: "people.read" }).allowed ||
    evaluatePermission(context, { permission: "academics.manage" }).allowed;
  const canViewAdmissions =
    evaluatePermission(context, { permission: "admissions.read" }).allowed ||
    evaluatePermission(context, { permission: "admissions.manage" }).allowed ||
    evaluatePermission(context, { permission: "people.read" }).allowed;

  const student = await getStudentDetail(context, studentId);
  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/people`;

  if (!student) {
    return (
      <div className="space-y-[var(--density-gap)]">
        <PeopleSubNav
          slug={context.institutionSlug}
          activeTab="students"
          canViewStaff={canViewStaff}
          canViewAdmissions={canViewAdmissions}
          canManageCustomFields={canManagePeople}
        />
        <StateNotice
          kind="permission-denied"
          title="Student record unavailable"
          description="You do not hold active access to this student profile, or the record does not belong to this institution."
          action={
            <Link
              href={basePath}
              className="inline-flex min-h-9 items-center rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-elevated"
            >
              Back to Roster
            </Link>
          }
        />
      </div>
    );
  }

  const fieldsByGroup = new Map<string, typeof student.customFields[number][]>();
  for (const field of student.customFields) {
    const groupList = fieldsByGroup.get(field.fieldGroup) ?? [];
    groupList.push(field);
    fieldsByGroup.set(field.fieldGroup, groupList);
  }

  const boundLifecycleAction = updateStudentLifecycleAction.bind(
    null,
    context.institutionSlug,
    student.id,
  );
  const boundGuardianAction = linkGuardianAction.bind(
    null,
    context.institutionSlug,
    student.id,
  );

  return (
    <div className="space-y-[var(--density-gap)]">
      <PeopleSubNav
        slug={context.institutionSlug}
        activeTab="students"
        canViewStaff={canViewStaff}
        canViewAdmissions={canViewAdmissions}
        canManageCustomFields={canManagePeople}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={basePath}
          className="text-xs font-medium text-accent hover:underline"
        >
          ← Back to Student Roster
        </Link>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="accent">{student.lifecycleStatus}</Badge>
          {student.activeEnrolment ? (
            <Badge tone="success">
              {student.activeEnrolment.sessionCode} •{" "}
              {student.activeEnrolment.sectionName} (Roll{" "}
              {student.activeEnrolment.rollNumber ?? "TBD"})
            </Badge>
          ) : (
            <Badge tone="neutral">No Active Session Enrolment</Badge>
          )}
        </div>
      </div>

      <Card
        title={student.fullName}
        description={`Admission Number: ${student.admissionNumber}`}
      >
        <dl className="grid gap-3 text-xs sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <dt className="font-medium text-fg-muted">Lifecycle Status</dt>
            <dd className="mt-0.5 font-semibold text-fg">
              {student.lifecycleStatus}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-fg-muted">Admission Date</dt>
            <dd className="mt-0.5 text-fg">
              {student.admissionDate ?? "Not recorded"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-fg-muted">PEN (Masked)</dt>
            <dd className="mt-0.5 font-mono text-fg">
              {student.maskedPenNumber ?? "Not linked"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-fg-muted">
              APAAR ID ({student.externalIdVerificationStatus})
            </dt>
            <dd className="mt-0.5 font-mono text-fg">
              {student.maskedApaarId ?? "Not linked"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-fg-muted">Stream</dt>
            <dd className="mt-0.5 text-fg">
              {student.activeEnrolment?.streamName ?? "Not assigned"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-fg-muted">Emergency Contact</dt>
            <dd className="mt-0.5 text-fg">
              {student.emergencyContactName
                ? `${student.emergencyContactName} (${student.emergencyContactPhone ?? "no phone"})`
                : "Not recorded"}
            </dd>
          </div>
        </dl>
      </Card>

      {canManagePeople ? (
        <Card
          title="Update Student Lifecycle"
          description="Controlled student state transition (audited in public.audit_events)."
        >
          <RegistryActionForm
            action={boundLifecycleAction}
            submitLabel="Update Lifecycle State"
            submitVariant="secondary"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="lifecycle-status-select"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Target Lifecycle State
                </label>
                <select
                  id="lifecycle-status-select"
                  name="lifecycleStatus"
                  defaultValue={student.lifecycleStatus}
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                >
                  {STUDENT_LIFECYCLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="lifecycle-reason-input"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Reason / Audit Note
                </label>
                <input
                  id="lifecycle-reason-input"
                  name="reason"
                  placeholder="Optional reason for audit log"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}

      <div className="grid gap-[var(--density-gap)] lg:grid-cols-2">
        <Card
          title="Linked Guardians"
          description="Active guardian relationships governing portal, notice, and pickup authority."
        >
          <div className="space-y-4">
            {student.guardians.length === 0 ? (
              <p className="text-xs text-fg-muted">
                No guardian links visible for your current access scope.
              </p>
            ) : (
              <ul className="space-y-2">
                {student.guardians.map((guardian) => (
                  <li
                    key={guardian.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-subtle bg-elevated px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-fg">
                        {guardian.fullName}
                      </p>
                      <p className="text-fg-muted">
                        {guardian.relationship}
                        {guardian.primaryEmail ? ` • ${guardian.primaryEmail}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {guardian.isPrimary ? (
                        <Badge tone="accent">Primary</Badge>
                      ) : null}
                      <Badge tone="success">{guardian.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {canManagePeople ? (
              <div className="border-t border-border-subtle pt-3">
                <h3 className="mb-2 text-xs font-semibold text-fg">
                  Link Guardian
                </h3>
                <RegistryActionForm
                  action={boundGuardianAction}
                  submitLabel="Link Guardian"
                  submitVariant="secondary"
                >
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="guardian-name-input"
                        className="mb-1 block text-xs font-medium text-fg"
                      >
                        Guardian Name *
                      </label>
                      <input
                        id="guardian-name-input"
                        name="guardianFullName"
                        required
                        className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="guardian-email-input"
                        className="mb-1 block text-xs font-medium text-fg"
                      >
                        Guardian Email *
                      </label>
                      <input
                        id="guardian-email-input"
                        name="guardianEmail"
                        type="email"
                        required
                        className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="guardian-rel-select"
                        className="mb-1 block text-xs font-medium text-fg"
                      >
                        Relationship
                      </label>
                      <select
                        id="guardian-rel-select"
                        name="relationship"
                        defaultValue="mother"
                        className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                      >
                        {GUARDIAN_RELATIONSHIPS.map((rel) => (
                          <option key={rel} value={rel}>
                            {rel}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-4 text-xs">
                      <label className="inline-flex items-center gap-1.5">
                        <input type="checkbox" name="isPrimary" />
                        <span>Primary</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          name="canViewAcademics"
                          defaultChecked
                        />
                        <span>Academics</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          name="canReceiveNotices"
                          defaultChecked
                        />
                        <span>Notices</span>
                      </label>
                      <label className="inline-flex items-center gap-1.5">
                        <input type="checkbox" name="canPickup" defaultChecked />
                        <span>Pickup</span>
                      </label>
                    </div>
                  </div>
                </RegistryActionForm>
              </div>
            ) : null}
          </div>
        </Card>

        <Card
          title="Custom Extension Fields"
          description="Sensitivity-filtered in both PostgreSQL RLS and server masking helpers. Confidential fields appear only to authorized sensitivity roles."
        >
          {fieldsByGroup.size === 0 ? (
            <p className="text-xs text-fg-muted">
              No custom fields visible for your active sensitivity permissions.
            </p>
          ) : (
            <div className="space-y-4">
              {[...fieldsByGroup.entries()].map(([groupName, fields]) => (
                <div key={groupName} className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    {groupName}
                  </h3>
                  {fields.map((field) => {
                    const canEditField =
                      canManagePeople &&
                      (field.sensitivityLevel !== "confidential" ||
                        canWriteSensitive);
                    const boundSaveValue = upsertCustomFieldValueAction.bind(
                      null,
                      context.institutionSlug,
                      field.definitionId,
                      "student",
                      student.id,
                    );

                    return (
                      <div
                        key={field.definitionId}
                        className="rounded-md border border-border-subtle bg-elevated p-2.5 text-xs"
                      >
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                          <span className="font-semibold text-fg">
                            {field.label}
                          </span>
                          <Badge
                            tone={
                              field.sensitivityLevel === "confidential"
                                ? "warning"
                                : field.sensitivityLevel === "restricted"
                                  ? "accent"
                                  : "neutral"
                            }
                          >
                            {field.sensitivityLevel}
                          </Badge>
                        </div>

                        {canEditField ? (
                          <RegistryActionForm
                            action={boundSaveValue}
                            submitLabel="Save Field"
                            submitVariant="secondary"
                            className="flex flex-wrap items-center gap-2"
                          >
                            <label
                              htmlFor={`cf-${field.definitionId}`}
                              className="sr-only"
                            >
                              {field.label}
                            </label>
                            {field.dataType === "select" ? (
                              <select
                                id={`cf-${field.definitionId}`}
                                name="value"
                                defaultValue={field.valueText ?? ""}
                                className="min-h-9 flex-1 rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                              >
                                <option value="">Select...</option>
                                {field.options.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                id={`cf-${field.definitionId}`}
                                name="value"
                                type={
                                  field.dataType === "number"
                                    ? "number"
                                    : field.dataType === "date"
                                      ? "date"
                                      : "text"
                                }
                                defaultValue={field.valueText ?? ""}
                                className="min-h-9 flex-1 rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                              />
                            )}
                          </RegistryActionForm>
                        ) : (
                          <p className="text-fg">
                            {field.valueText ?? "Not set"}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
