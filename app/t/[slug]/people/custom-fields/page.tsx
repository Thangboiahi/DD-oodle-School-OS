import { upsertCustomFieldDefinitionAction } from "@/app/t/[slug]/people/actions";
import { PeopleSubNav } from "@/components/registry/PeopleSubNav";
import { RegistryActionForm } from "@/components/registry/RegistryActionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StateNotice } from "@/components/ui/StateNotice";
import { evaluatePermission } from "@/lib/auth/permissions";
import {
  CUSTOM_FIELD_DATA_TYPES,
  CUSTOM_FIELD_ENTITY_TYPES,
  CUSTOM_FIELD_SENSITIVITY_LEVELS,
} from "@/lib/registry/schemas";
import { listCustomFieldDefinitions } from "@/server/registry/service";
import { resolveVerifiedTenantContext } from "@/server/tenancy/resolve-context";

export const dynamic = "force-dynamic";

interface CustomFieldsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CustomFieldsPage({
  params,
}: CustomFieldsPageProps) {
  const { slug } = await params;
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
  const canViewStaff =
    evaluatePermission(context, { permission: "people.read" }).allowed ||
    evaluatePermission(context, { permission: "academics.manage" }).allowed;
  const canViewAdmissions =
    evaluatePermission(context, { permission: "admissions.read" }).allowed ||
    evaluatePermission(context, { permission: "admissions.manage" }).allowed ||
    canViewStaff;

  if (!canManagePeople) {
    return (
      <div className="space-y-[var(--density-gap)]">
        <PeopleSubNav
          slug={context.institutionSlug}
          activeTab="custom-fields"
          canViewStaff={canViewStaff}
          canViewAdmissions={canViewAdmissions}
          canManageCustomFields={false}
        />
        <StateNotice
          kind="permission-denied"
          title="Custom field configuration restricted"
          description="You require people.manage authority to define or modify institutional custom fields."
        />
      </div>
    );
  }

  const definitions = await listCustomFieldDefinitions(context);
  const boundSaveDefinition = upsertCustomFieldDefinitionAction.bind(
    null,
    context.institutionSlug,
  );

  return (
    <div className="space-y-[var(--density-gap)]">
      <PeopleSubNav
        slug={context.institutionSlug}
        activeTab="custom-fields"
        canViewStaff={canViewStaff}
        canViewAdmissions={canViewAdmissions}
        canManageCustomFields={true}
      />

      <Card
        title="Configure Custom Extension Field"
        description="Add institution-specific fields (ADR-0004) with typed validation and SQL RLS sensitivity enforcement (standard, restricted, confidential)."
      >
        <RegistryActionForm
          action={boundSaveDefinition}
          submitLabel="Save Custom Field Definition"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="cf-entity-type"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Entity Type *
              </label>
              <select
                id="cf-entity-type"
                name="entityType"
                defaultValue="student"
                className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
              >
                {CUSTOM_FIELD_ENTITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="cf-field-key"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Field Key (snake_case) *
              </label>
              <input
                id="cf-field-key"
                name="fieldKey"
                required
                placeholder="bus_route_code"
                className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 font-mono text-xs text-fg"
              />
            </div>

            <div>
              <label
                htmlFor="cf-label"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Display Label *
              </label>
              <input
                id="cf-label"
                name="label"
                required
                placeholder="Bus Route Code"
                className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
              />
            </div>

            <div>
              <label
                htmlFor="cf-group"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Field Group
              </label>
              <input
                id="cf-group"
                name="fieldGroup"
                defaultValue="general"
                className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
              />
            </div>

            <div>
              <label
                htmlFor="cf-data-type"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Data Type *
              </label>
              <select
                id="cf-data-type"
                name="dataType"
                defaultValue="text"
                className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
              >
                {CUSTOM_FIELD_DATA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="cf-sensitivity"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Sensitivity Classification *
              </label>
              <select
                id="cf-sensitivity"
                name="sensitivityLevel"
                defaultValue="standard"
                className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
              >
                {CUSTOM_FIELD_SENSITIVITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="cf-options"
                className="mb-1 block text-xs font-medium text-fg"
              >
                Select Options (comma-separated, required if Data Type = select)
              </label>
              <input
                id="cf-options"
                name="options"
                placeholder="Tagore, Ashoka, Raman, Nehru"
                className="min-h-9 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-fg"
              />
            </div>

            <div className="flex items-center pt-4 text-xs">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="isRequired" />
                <span>Required field</span>
              </label>
            </div>
          </div>
        </RegistryActionForm>
      </Card>

      <Card
        title="Active Institutional Custom Fields"
        description="Definitions enforced identically across RLS policies and server validation."
      >
        {definitions.length === 0 ? (
          <StateNotice
            kind="empty"
            title="No custom fields defined yet"
            description="Add an institutional custom field definition above."
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border-subtle">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-elevated text-fg-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Key
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Label
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Entity
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Type
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Sensitivity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface">
                {definitions.map((def) => (
                  <tr key={def.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono font-medium text-fg">
                      {def.fieldKey}
                    </td>
                    <td className="px-3 py-2 text-fg">{def.label}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-fg-muted">
                      {def.entityType}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-fg-muted">
                      {def.dataType}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Badge
                        tone={
                          def.sensitivityLevel === "confidential"
                            ? "warning"
                            : def.sensitivityLevel === "restricted"
                              ? "accent"
                              : "neutral"
                        }
                      >
                        {def.sensitivityLevel}
                      </Badge>
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
