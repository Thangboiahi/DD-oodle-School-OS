import Link from "next/link";
import {
  createAdmissionAction,
  transitionAdmissionAction,
} from "@/app/t/[slug]/people/actions";
import { PeopleSubNav } from "@/components/registry/PeopleSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { evaluatePermission } from "@/lib/auth/permissions";
import {
  ALLOWED_ADMISSION_TRANSITIONS,
  type AdmissionStatus,
} from "@/lib/registry/schemas";
import { listAdmissions } from "@/server/registry/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface AdmissionsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function AdmissionsPage({
  params,
  searchParams,
}: AdmissionsPageProps) {
  const { slug } = await params;
  const queryParams = await searchParams;
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
  const canReadAdmissions =
    evaluatePermission(context, { permission: "admissions.read" }).allowed ||
    evaluatePermission(context, { permission: "admissions.manage" }).allowed ||
    evaluatePermission(context, { permission: "people.read" }).allowed;
  const canManageAdmissions =
    evaluatePermission(context, { permission: "admissions.manage" }).allowed ||
    evaluatePermission(context, { permission: "people.manage" }).allowed;
  const canManagePeople = evaluatePermission(context, {
    permission: "people.manage",
  }).allowed;
  const canViewStaff =
    evaluatePermission(context, { permission: "people.read" }).allowed ||
    evaluatePermission(context, { permission: "academics.manage" }).allowed;

  if (!canReadAdmissions) {
    return (
      <div className="space-y-[var(--density-gap)]">
        <PeopleSubNav
          slug={context.institutionSlug}
          activeTab="admissions"
          canViewStaff={canViewStaff}
          canViewAdmissions={false}
          canManageCustomFields={canManagePeople}
        />
        <StateNotice
          kind="permission-denied"
          title="Admissions pipeline restricted"
          description="You require admissions.read or people.read permission to view admission applications."
        />
      </div>
    );
  }

  const page = Number.parseInt(queryParams.page ?? "1", 10) || 1;
  const pipeline = await listAdmissions(context, {
    status: queryParams.status as AdmissionStatus | undefined,
    page,
    pageSize: 25,
  });

  const boundCreateAdmission = createAdmissionAction.bind(
    null,
    context.institutionSlug,
  );
  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/people`;

  return (
    <div className="space-y-[var(--density-gap)]">
      <PeopleSubNav
        slug={context.institutionSlug}
        activeTab="admissions"
        canViewStaff={canViewStaff}
        canViewAdmissions={true}
        canManageCustomFields={canManagePeople}
      />

      {canManageAdmissions ? (
        <Card
          title="New Admission Enquiry"
          description="Records an incoming admission application prior to approval and formal student profile enrolment."
        >
          <RegistryActionForm
            action={boundCreateAdmission}
            submitLabel="Create Application"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="adm-applicant-name"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Applicant Name *
                </label>
                <input
                  id="adm-applicant-name"
                  name="applicantFullName"
                  required
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label
                  htmlFor="adm-applicant-email"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Applicant / Contact Email
                </label>
                <input
                  id="adm-applicant-email"
                  name="applicantEmail"
                  type="email"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label
                  htmlFor="adm-session-label"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Target Session *
                </label>
                <input
                  id="adm-session-label"
                  name="targetSessionLabel"
                  required
                  defaultValue="2026-27"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label
                  htmlFor="adm-grade-code"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Target Class *
                </label>
                <input
                  id="adm-grade-code"
                  name="targetGradeCode"
                  required
                  defaultValue="XI"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label
                  htmlFor="adm-guardian-name"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Guardian Name
                </label>
                <input
                  id="adm-guardian-name"
                  name="guardianFullName"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
              <div>
                <label
                  htmlFor="adm-guardian-phone"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Guardian Phone
                </label>
                <input
                  id="adm-guardian-phone"
                  name="guardianPhone"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
                />
              </div>
            </div>
          </RegistryActionForm>
        </Card>
      ) : null}

      <Card
        title="Admissions Pipeline"
        description="Controlled transitions from enquiry through approval and Student Profile creation (preserving permanent person identity)."
      >
        {pipeline.items.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No admission applications yet"
            description="Create a new enquiry above to begin tracking admissions."
          />
        ) : (
          <div className="space-y-3">
            {pipeline.items.map((app) => {
              const allowedNext = ALLOWED_ADMISSION_TRANSITIONS[app.status];
              const boundTransition = transitionAdmissionAction.bind(
                null,
                context.institutionSlug,
                app.id,
              );

              return (
                <div
                  key={app.id}
                  className="rounded-md border border-border-subtle bg-elevated p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-fg">
                        {app.applicantFullName}
                      </p>
                      <p className="text-fg-muted">
                        Target: Class {app.targetGradeCode} ({app.targetSessionLabel})
                        {app.applicantEmail ? ` • ${app.applicantEmail}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{app.status}</Badge>
                      {app.admittedStudentProfileId ? (
                        <Link
                          href={`${basePath}/students/${encodeURIComponent(app.admittedStudentProfileId)}`}
                          className="font-medium text-accent hover:underline"
                        >
                          View Student
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {canManageAdmissions && allowedNext.length > 0 ? (
                    <div className="mt-3 border-t border-border-subtle pt-2.5">
                      <RegistryActionForm
                        action={boundTransition}
                        submitLabel="Apply Transition"
                        submitVariant="secondary"
                        className="flex flex-wrap items-end gap-2"
                      >
                        <div>
                          <label
                            htmlFor={`next-${app.id}`}
                            className="mb-1 block text-[11px] font-medium text-fg-muted"
                          >
                            Next Stage
                          </label>
                          <select
                            id={`next-${app.id}`}
                            name="nextStatus"
                            className="min-h-9 rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                          >
                            {allowedNext.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {statusOption}
                              </option>
                            ))}
                          </select>
                        </div>

                        {allowedNext.includes("enrolled") && canManagePeople ? (
                          <div>
                            <label
                              htmlFor={`admno-${app.id}`}
                              className="mb-1 block text-[11px] font-medium text-fg-muted"
                            >
                              Admission No. (for enrolled)
                            </label>
                            <input
                              id={`admno-${app.id}`}
                              name="admissionNumber"
                              placeholder="ADM-SR-2026-..."
                              className="min-h-9 rounded-md border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                            />
                          </div>
                        ) : null}
                      </RegistryActionForm>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
