import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { getHandbookDirectory } from "@/server/handbook/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface HandbookDirectoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; section?: string }>;
}

export default async function HandbookDirectoryPage({
  params,
  searchParams,
}: HandbookDirectoryPageProps) {
  const { slug } = await params;
  const search = await searchParams;
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
  const directory = await getHandbookDirectory(context, {
    query: search.q,
    sectionId: search.section,
  });

  const basePath = `/t/${encodeURIComponent(context.institutionSlug)}/handbook`;

  return (
    <div className="min-w-0 space-y-[var(--density-gap)]">
      {directory.isMonitorClassmateRestricted ? (
        <div
          role="status"
          className="rounded-lg border border-border-strong bg-surface p-[var(--density-pad)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-fg">
                Classmate handbooks are private — only your own student handbook
                is accessible
              </h2>
              <p className="text-xs text-fg-muted">
                Monitor / Monitress section coordination permissions never grant
                access to peers&apos; diaries, observations, support notes, or
                disciplinary records.
              </p>
            </div>
            <Badge tone="accent">Self Handbook Only</Badge>
          </div>
        </div>
      ) : null}

      <Card
        title="Digital Student Handbook Directory"
        description={
          directory.activeSession
            ? `Active Session: ${directory.activeSession.name} (${directory.activeSession.code}) — category- and visibility-partitioned under PostgreSQL RLS.`
            : "No active academic session configured."
        }
      >
        {directory.canViewSectionFilter ? (
          <form
            method="GET"
            className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4"
          >
            <div>
              <label
                htmlFor="handbook-search-q"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Search Name or Admission #
              </label>
              <input
                id="handbook-search-q"
                name="q"
                type="search"
                defaultValue={directory.query}
                placeholder="Aarav or ADM-SR-..."
                className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
              />
            </div>

            <div>
              <label
                htmlFor="handbook-section-filter"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Section
              </label>
              <select
                id="handbook-section-filter"
                name="section"
                defaultValue={directory.selectedSectionId}
                className="min-h-10 w-full rounded-md border border-border-strong bg-surface px-2.5 text-xs text-fg"
              >
                <option value="">All Accessible Sections</option>
                {directory.sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.gradeCode} {sec.code} — {sec.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button type="submit" variant="secondary" size="sm">
                Filter Students
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-fg-muted">
            Showing student handbook profiles accessible under your active
            institutional relationship scope.
          </p>
        )}
      </Card>

      <Card
        title="Accessible Student Handbooks"
        description={`${directory.students.length} student record(s) visible in your active scope.`}
      >
        {directory.students.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No accessible student handbooks found"
            description="Adjust search filters or verify your guardian, teaching-group, or section assignment scope."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full min-w-[38rem] divide-y divide-border-subtle text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Section</th>
                  <th className="px-3 py-2 font-medium">Visible Entries</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {directory.students.map((student) => (
                  <tr key={student.studentProfileId}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">
                        {student.fullName}
                      </div>
                      <div className="font-mono text-[11px] text-fg-muted">
                        {student.admissionNumber}
                        {student.rollNumber ? ` • Roll #${student.rollNumber}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-fg-muted">
                      {student.sectionCode
                        ? `${student.gradeCode ?? ""} ${student.sectionCode}`.trim()
                        : "Unassigned"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        tone={
                          student.visibleEntryCount > 0 ? "accent" : "neutral"
                        }
                      >
                        {student.visibleEntryCount} active
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`${basePath}/${encodeURIComponent(student.studentProfileId)}`}
                        className="inline-flex min-h-9 items-center rounded-md border border-accent bg-surface px-3 text-xs font-medium text-accent hover:bg-elevated"
                      >
                        Open Handbook
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
