import Link from "next/link";
import {
  cancelImportBatchAction,
  commitImportBatchAction,
  validateImportBatchAction,
} from "@/app/t/[slug]/imports/actions";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { evaluatePermission } from "@/lib/auth/permissions";
import {
  IMPORT_FIELD_SPECS,
  suggestColumnMapping,
} from "@/lib/imports/validators";
import {
  getImportBatchDetail,
  type ImportRowValidationStatus,
} from "@/server/imports/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

function rowTone(
  status: ImportRowValidationStatus,
): "neutral" | "accent" | "success" | "warning" | "danger" {
  switch (status) {
    case "committed":
    case "valid":
      return "success";
    case "duplicate":
      return "warning";
    case "error":
      return "danger";
    default:
      return "neutral";
  }
}

export default async function ImportBatchDetailPage({
  params,
}: {
  params: Promise<{ slug: string; batchId: string }>;
}) {
  const { slug, batchId } = await params;
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
        description="You do not hold imports.manage or people.manage permissions for this institution."
      />
    );
  }

  const detail = await getImportBatchDetail(context, batchId);
  if (!detail) {
    return (
      <StateNotice
        kind="empty"
        title="Import batch not found"
        description="This staged import batch does not exist or is not accessible in this institution."
      />
    );
  }

  const { batch, headers, rows } = detail;
  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/imports`;
  const fieldSpecs = IMPORT_FIELD_SPECS[batch.dataType];
  const initialMapping =
    Object.keys(batch.columnMapping).length > 0
      ? batch.columnMapping
      : suggestColumnMapping(headers, batch.dataType);

  const isLocked =
    batch.status === "committed" || batch.status === "cancelled";
  const canCommit = batch.status === "validated" && batch.validRows > 0;

  const boundValidate = validateImportBatchAction.bind(
    null,
    context.institutionSlug,
    batch.id,
    batch.dataType,
  );
  const boundCommit = commitImportBatchAction.bind(
    null,
    context.institutionSlug,
    batch.id,
  );
  const boundCancel = cancelImportBatchAction.bind(
    null,
    context.institutionSlug,
    batch.id,
  );

  const previewRows = rows.slice(0, 200);

  return (
    <div className="space-y-[var(--density-gap)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={basePath} className="text-xs font-medium text-accent underline">
              &larr; All Import Batches
            </Link>
            <Badge tone="neutral">{batch.dataType}</Badge>
            <Badge tone="accent">{batch.sourceFormat.toUpperCase()}</Badge>
            <Badge
              tone={
                batch.status === "committed"
                  ? "success"
                  : batch.status === "validated"
                    ? "accent"
                    : "warning"
              }
            >
              {batch.status}
            </Badge>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-fg">
            {batch.sourceFilename}
          </h2>
          <p className="text-xs text-fg-muted">
            Idempotency Key: <code>{batch.idempotencyKey}</code>
          </p>
        </div>

        <a
          href={`${basePath}/${batch.id}/report`}
          className="inline-flex min-h-9 items-center rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-elevated"
        >
          Download CSV Report
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-md border border-border-subtle bg-surface p-2.5">
          <div className="text-xs text-fg-muted">Total Staged</div>
          <div className="text-base font-semibold text-fg">
            {batch.totalRows}
          </div>
        </div>
        <div className="rounded-md border border-border-subtle bg-surface p-2.5">
          <div className="text-xs text-fg-muted">Valid</div>
          <div className="text-base font-semibold text-status-success">
            {batch.validRows}
          </div>
        </div>
        <div className="rounded-md border border-border-subtle bg-surface p-2.5">
          <div className="text-xs text-fg-muted">Duplicates (Skipped)</div>
          <div className="text-base font-semibold text-status-warning">
            {batch.duplicateRows}
          </div>
        </div>
        <div className="rounded-md border border-border-subtle bg-surface p-2.5">
          <div className="text-xs text-fg-muted">Validation Errors</div>
          <div className="text-base font-semibold text-status-danger">
            {batch.errorRows}
          </div>
        </div>
        <div className="rounded-md border border-border-subtle bg-surface p-2.5">
          <div className="text-xs text-fg-muted">Committed</div>
          <div className="text-base font-semibold text-fg">
            {batch.committedRows}
          </div>
        </div>
      </div>

      <div className="grid gap-[var(--density-gap)] lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-6">
          <Card
            title="Step 1: Map Columns & Run Dry-Run Validation"
            description="Verify spreadsheet header mapping before writing any institutional records."
          >
            {isLocked ? (
              <p className="text-xs text-fg-muted">
                Mapping is locked because this batch is {batch.status}.
              </p>
            ) : (
              <RegistryActionForm
                action={boundValidate}
                submitLabel="Validate & Preview Dry-Run"
                pendingLabel="Validating..."
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {fieldSpecs.map((spec) => (
                    <div key={spec.key}>
                      <label
                        htmlFor={`map-${spec.key}`}
                        className="mb-1 block text-xs font-medium text-fg"
                      >
                        {spec.label}
                        {spec.required ? " *" : ""}
                      </label>
                      <select
                        id={`map-${spec.key}`}
                        name={`map_${spec.key}`}
                        defaultValue={initialMapping[spec.key] ?? ""}
                        className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">-- Unmapped --</option>
                        {headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </RegistryActionForm>
            )}
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-6">
          <Card
            title="Step 2: Authorize & Idempotent Commit"
            description="Commits ONLY rows marked valid. Errors and duplicates are skipped cleanly without overwriting."
          >
            <div className="space-y-3">
              {batch.status === "committed" ? (
                <StateNotice
                  kind="empty"
                  title="Batch Committed"
                  description={`${batch.committedRows} valid rows committed on ${batch.committedAt ?? "record"}. Re-triggering commit returns safely without duplicate writes.`}
                />
              ) : batch.status === "cancelled" ? (
                <StateNotice
                  kind="empty"
                  title="Batch Cancelled"
                  description="This staged batch was cancelled with zero target records modified."
                />
              ) : canCommit ? (
                <RegistryActionForm
                  action={boundCommit}
                  submitLabel={`Authorize & Commit ${batch.validRows} Valid Row(s)`}
                  pendingLabel="Committing..."
                >
                  <p className="text-xs text-fg">
                    Ready to commit <strong>{batch.validRows}</strong> validated
                    row(s). <strong>{batch.duplicateRows}</strong> duplicate(s)
                    and <strong>{batch.errorRows}</strong> error row(s) will be
                    skipped and included in the downloadable CSV report.
                  </p>
                </RegistryActionForm>
              ) : (
                <p className="text-xs text-fg-muted">
                  Run dry-run validation first and ensure at least 1 valid row
                  is ready before authorizing commit.
                </p>
              )}

              {!isLocked ? (
                <RegistryActionForm
                  action={boundCancel}
                  submitLabel="Cancel Staged Batch"
                  pendingLabel="Cancelling..."
                  submitVariant="secondary"
                >
                  <span className="text-xs text-fg-muted">
                    Discards authorization without touching target tables.
                  </span>
                </RegistryActionForm>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <Card
        title="Dry-Run Row Preview"
        description={
          rows.length > previewRows.length
            ? `Showing first ${previewRows.length} of ${rows.length} rows. Download the CSV report for the complete ledger.`
            : `Inspecting all ${rows.length} staged rows.`
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-fg-muted">
                <th className="py-2 pr-3 font-medium">Row</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Payload Summary</th>
                <th className="py-2 font-medium">Errors / Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {previewRows.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-3 align-top font-mono text-fg">
                    #{row.rowNumber}
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <Badge tone={rowTone(row.validationStatus)}>
                      {row.validationStatus}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 align-top text-xs text-fg-muted">
                    <code className="break-all">
                      {JSON.stringify(
                        row.normalizedPayload ?? row.rawPayload,
                      ).slice(0, 140)}
                    </code>
                  </td>
                  <td className="py-2 align-top text-xs">
                    {row.errorMessages.length > 0 ? (
                      <ul className="list-disc pl-4 text-status-danger">
                        {row.errorMessages.map((msg, idx) => (
                          <li key={idx}>{msg}</li>
                        ))}
                      </ul>
                    ) : row.targetEntityId ? (
                      <span className="text-fg-muted">
                        Entity: <code>{row.targetEntityId}</code>
                      </span>
                    ) : (
                      <span className="text-fg-muted">Ready</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
