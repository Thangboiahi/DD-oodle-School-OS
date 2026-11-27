import { describe, expect, it } from "vitest";
import {
  filterAndMaskCustomFields,
  maskExternalIdentifier,
  type CustomFieldDefinitionLike,
  type CustomFieldValueLike,
} from "@/lib/registry/masking";

const DEFINITIONS: readonly CustomFieldDefinitionLike[] = [
  {
    id: "def-standard",
    entityType: "student",
    fieldKey: "house_name",
    label: "House Name",
    fieldGroup: "co_curricular",
    dataType: "text",
    options: [],
    isRequired: false,
    sensitivityLevel: "standard",
    isActive: true,
  },
  {
    id: "def-restricted",
    entityType: "student",
    fieldKey: "bus_pass_category",
    label: "Concession / Bus Pass Category",
    fieldGroup: "transport",
    dataType: "text",
    options: [],
    isRequired: false,
    sensitivityLevel: "restricted",
    isActive: true,
  },
  {
    id: "def-confidential",
    entityType: "student",
    fieldKey: "counseling_note",
    label: "Counseling Note",
    fieldGroup: "pastoral",
    dataType: "text",
    options: [],
    isRequired: false,
    sensitivityLevel: "confidential",
    isActive: true,
  },
];

const VALUES: readonly CustomFieldValueLike[] = [
  { definitionId: "def-standard", valueText: "Tagore House", valueJson: "Tagore House" },
  { definitionId: "def-restricted", valueText: "Route-12 Exempt", valueJson: "Route-12 Exempt" },
  {
    definitionId: "def-confidential",
    valueText: "Confidential pastoral note",
    valueJson: "Confidential pastoral note",
  },
];

describe("Registry sensitivity filtering & identifier masking", () => {
  it("allows Principal (institution.*) to view standard, restricted, and confidential fields", () => {
    const visible = filterAndMaskCustomFields(DEFINITIONS, VALUES, [
      "institution.*",
    ]);
    expect(visible.map((item) => item.fieldKey)).toEqual([
      "house_name",
      "bus_pass_category",
      "counseling_note",
    ]);
  });

  it("exposes ONLY standard fields to Class Teacher, Subject Teacher, and Monitor roles", () => {
    const classTeacher = filterAndMaskCustomFields(DEFINITIONS, VALUES, [
      "section.coordinate",
    ]);
    const subjectTeacher = filterAndMaskCustomFields(DEFINITIONS, VALUES, [
      "academics.teach",
    ]);
    const monitor = filterAndMaskCustomFields(DEFINITIONS, VALUES, [
      "classroom.summary.read",
    ]);

    expect(classTeacher.map((item) => item.fieldKey)).toEqual(["house_name"]);
    expect(subjectTeacher.map((item) => item.fieldKey)).toEqual(["house_name"]);
    expect(monitor.map((item) => item.fieldKey)).toEqual(["house_name"]);
  });

  it("allows restricted readers to see standard + restricted without confidential", () => {
    const visible = filterAndMaskCustomFields(DEFINITIONS, VALUES, [
      "people.restricted.read",
    ]);
    expect(visible.map((item) => item.fieldKey)).toEqual([
      "house_name",
      "bus_pass_category",
    ]);
  });

  it("masks PEN and APAAR identifiers to last 4 characters unless full view is authorized", () => {
    expect(maskExternalIdentifier("PEN-SYNTH-SR-001", false)).toBe(
      "••••••••••••-001",
    );
    expect(maskExternalIdentifier("PEN-SYNTH-SR-001", true)).toBe(
      "PEN-SYNTH-SR-001",
    );
    expect(maskExternalIdentifier("1234", false)).toBe("••••");
    expect(maskExternalIdentifier(null, false)).toBeNull();
  });
});
