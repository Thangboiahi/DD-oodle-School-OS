import Link from "next/link";
import { stageImportBatchAction } from "@/app/t/[slug]/imports/actions";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { evaluatePermission } from "@/lib/auth/permissions";
import {
  IMPORT_DATA_TYPES,
  type ImportDataType,
} from "@/lib/imports/validators";
import {
  listImportBatches,
  type ImportBatchStatus,
} from "@/server/imports/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

const DATA_TYPE_LABELS: Record<ImportDataType, string> = {
  students: "Students Registry",
  staff: "Staff Directory",
  subject_enrolments: "Student Subject Enrolments",
};

function statusTone(
  status: ImportBatchStatus,
): "neutral" | "accent" | "success" | "warning" | "danger" {
  switch (status) {
    case "committed":
      return "success";
    case "validated":
      return "accent";
    case "staged":
      return "warning";
    case "failed":
      return "danger";
    case "cancelled":
      return "neutral";
  }
}

export default async function BulkImportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolution = await resolveVerifiedTenantContext(slug);

  if (resolution.status !== "ok") {
    return (
      <StateNotice
        kind="permission-denied"
        title="Workspace verification required"
        description="Server-side membership verification did not succeed for this institution."
      />
    );
  }

  const { context } = resolution;
  const canManage =
    evaluatePermission(context, { permission: "imports.manage" }).allowed ||
    evaluatePermission(context, { permission: "people.manage" }).allowed;

  if (!canManage) {
    return (
      <StateNotice
        kind="permission-denied"
        title="Bulk import authorization required"
        description="Only institutional operators holding imports.manage or people.manage permission can access staged bulk imports."
      />
    );
  }

  const batches = await listImportBatches(context);
  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/imports`;
  const boundStageAction = stageImportBatchAction.bind(
    null,
    context.institutionSlug,
  );
  const suggestedKey = `batch-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${batches.length + 1}`;

  return (
    <div className="space-y-[var(--density-gap)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-fg">Bulk Import Centre</h2>
          <p className="text-xs text-fg-muted">
            Staged spreadsheet onboarding: Upload -&gt; Map Columns -&gt;
            Dry-Run Preview -&gt; Authorize &amp; Idempotent Commit. No direct
            unreviewed writes.
          </p>
        </div>
        <Badge tone="accent">Max 5 MB / 5,000 rows</Badge>
      </div>

      <div className="grid gap-[var(--density-gap)] lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5">
          <Card
            title="Stage New CSV / XLSX Batch"
            description="Accepted formats: RFC-4180 .csv and .xlsx. Aadhaar columns are blocked by policy."
          >
            <RegistryActionForm
              action={boundStageAction}
              submitLabel="Upload & Stage Batch"
              pendingLabel="Staging..."
            >
              <div>
                <label
                  htmlFor="import-data-type"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Target Registry
                </label>
                <select
                  id="import-data-type"
                  name="dataType"
                  defaultValue="students"
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {IMPORT_DATA_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {DATA_TYPE_LABELS[dt]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="import-idempotency-key"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Idempotency Key
                </label>
                <input
                  id="import-idempotency-key"
                  name="idempotencyKey"
                  type="text"
                  required
                  minLength={3}
                  maxLength={80}
                  defaultValue={suggestedKey}
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="mt-1 text-xs text-fg-muted">
                  Reusing an existing key opens the staged batch safely without
                  duplicating rows.
                </p>
              </div>

              <div>
                <label
                  htmlFor="import-file"
                  className="mb-1 block text-xs font-medium text-fg"
                >
                  Spreadsheet File (.csv or .xlsx)
                </label>
                <input
                  id="import-file"
                  name="file"
                  type="file"
                  accept=".csv,.xlsx"
                  required
                  className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </RegistryActionForm>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <Card
            title="Recent Import Batches"
            description="Review staged dry-runs, authorize valid commits, or download formula-safe CSV audit reports."
          >
            {batches.length === 0 ? (
              <StateNotice
                kind="empty"
                title="No import batches staged yet"
                description="Upload a CSV or XLSX sheet on the left to inspect column mapping and dry-run validation."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle text-fg-muted">
                      <th className="py-2 pr-3 font-medium">Batch</th>
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Counts</th>
                      <th className="py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {batches.map((batch) => (
                      <tr key={batch.id}>
                        <td className="py-2 pr-3 align-top">
                          <div className="font-medium text-fg">
                            {batch.sourceFilename}
                          </div>
                          <div className="text-xs text-fg-muted">
                            Key: <code>{batch.idempotencyKey}</code>
                          </div>
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <Badge tone="neutral">{batch.dataType}</Badge>
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <Badge tone={statusTone(batch.status)}>
                            {batch.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 align-top text-xs text-fg-muted">
                          <div>Total: {batch.totalRows}</div>
                          <div>
                            Valid {batch.validRows} / Dup {batch.duplicateRows}{" "}
                            / Err {batch.errorRows}
                          </div>
                          {batch.status === "committed" ? (
                            <div className="font-semibold text-fg">
                              Committed: {batch.committedRows}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`${basePath}/${batch.id}`}
                              className="font-medium text-accent underline"
                            >
                              Inspect
                            </Link>
                            <a
                              href={`${basePath}/${batch.id}/report`}
                              className="font-medium text-fg underline"
                            >
                              CSV Report
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
