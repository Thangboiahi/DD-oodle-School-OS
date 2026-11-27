import {
  evaluatePermission,
  type VerifiedTenantContext,
} from "@/lib/auth/permissions";
import type {
  CustomFieldDataType,
  CustomFieldEntityType,
  CustomFieldSensitivityLevel,
} from "@/lib/registry/schemas";

export interface CustomFieldDefinitionLike {
  id: string;
  entityType: CustomFieldEntityType;
  fieldKey: string;
  label: string;
  fieldGroup: string;
  dataType: CustomFieldDataType;
  options: readonly string[];
  isRequired: boolean;
  sensitivityLevel: CustomFieldSensitivityLevel;
  isActive: boolean;
}

export interface CustomFieldValueLike {
  definitionId: string;
  valueText: string | null;
  valueJson: unknown;
}

export interface FilteredCustomFieldItem {
  definitionId: string;
  fieldKey: string;
  label: string;
  fieldGroup: string;
  dataType: CustomFieldDataType;
  options: readonly string[];
  isRequired: boolean;
  sensitivityLevel: CustomFieldSensitivityLevel;
  valueText: string | null;
  valueJson: unknown;
}

export type PermissionSource = VerifiedTenantContext | readonly string[];

function hasPermission(source: PermissionSource, permission: string): boolean {
  if (Array.isArray(source)) {
    return source.includes("institution.*") || source.includes(permission);
  }
  return evaluatePermission(source as VerifiedTenantContext, { permission })
    .allowed;
}

export function canReadSensitivityLevel(
  sensitivityLevel: CustomFieldSensitivityLevel,
  permissions: PermissionSource,
): boolean {
  if (sensitivityLevel === "confidential") {
    return hasPermission(permissions, "people.sensitive.read");
  }
  if (sensitivityLevel === "restricted") {
    return (
      hasPermission(permissions, "people.restricted.read") ||
      hasPermission(permissions, "people.sensitive.read")
    );
  }
  return true;
}

/**
 * Defense-in-depth sensitivity filter applied on top of PostgreSQL RLS:
 * - hides `confidential` unless caller holds `people.sensitive.read` or `institution.*`
 * - hides `restricted` unless caller holds `people.restricted.read`, `people.sensitive.read`, or `institution.*`
 */
export function filterAndMaskCustomFields(
  definitions: readonly CustomFieldDefinitionLike[],
  values: readonly CustomFieldValueLike[],
  permissions: PermissionSource,
): FilteredCustomFieldItem[] {
  const valuesByDefinitionId = new Map<string, CustomFieldValueLike>();
  for (const val of values) {
    valuesByDefinitionId.set(val.definitionId, val);
  }

  return definitions
    .filter(
      (definition) =>
        definition.isActive &&
        canReadSensitivityLevel(definition.sensitivityLevel, permissions),
    )
    .map((definition) => {
      const value = valuesByDefinitionId.get(definition.id);
      return {
        definitionId: definition.id,
        fieldKey: definition.fieldKey,
        label: definition.label,
        fieldGroup: definition.fieldGroup,
        dataType: definition.dataType,
        options: definition.options,
        isRequired: definition.isRequired,
        sensitivityLevel: definition.sensitivityLevel,
        valueText: value?.valueText ?? null,
        valueJson: value?.valueJson ?? null,
      };
    });
}

/**
 * Masks PEN / APAAR external identifiers to last 4 characters unless full view is authorized.
 */
export function maskExternalIdentifier(
  value: string | null | undefined,
  canViewFull: boolean,
): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (canViewFull) {
    return trimmed;
  }
  if (trimmed.length <= 4) {
    return "••••";
  }
  const maskLength = Math.max(4, trimmed.length - 4);
  return `${"•".repeat(maskLength)}${trimmed.slice(-4)}`;
}
