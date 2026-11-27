import { describe, expect, it } from "vitest";
import {
  canTransitionAdmissionStatus,
  createAdmissionSchema,
  createStaffSchema,
  createStudentSchema,
  customFieldDefinitionSchema,
  linkGuardianSchema,
  transitionAdmissionSchema,
  validateCustomFieldValue,
} from "@/lib/registry/schemas";

describe("Registry Zod schemas & transitions", () => {
  it("accepts valid student input and strictly rejects unexpected Aadhaar fields", () => {
    const valid = createStudentSchema.safeParse({
      fullName: "Aarav Verma",
      email: "aarav@example.test",
      admissionNumber: "ADM-SR-2026-099",
      penNumber: "PEN-SYNTH-099",
      externalIdVerificationStatus: "verified",
    });
    expect(valid.success).toBe(true);

    const rejectedAadhaar = createStudentSchema.safeParse({
      fullName: "Aarav Verma",
      admissionNumber: "ADM-SR-2026-099",
      aadhaarNumber: "1234-5678-9012",
    });
    expect(rejectedAadhaar.success).toBe(false);
  });

  it("validates staff creation, guardian linking, and admission enquiries", () => {
    expect(
      createStaffSchema.safeParse({
        fullName: "Priya Nair",
        employeeCode: "EMP-SR-020",
        designation: "PGT Physics",
        employmentType: "full_time",
      }).success,
    ).toBe(true);

    expect(
      linkGuardianSchema.safeParse({
        studentProfileId: "88888888-8888-4888-8888-888888880101",
        guardianFullName: "Ramesh Verma",
        guardianEmail: "ramesh@example.test",
        relationship: "father",
        isPrimary: true,
      }).success,
    ).toBe(true);

    expect(
      createAdmissionSchema.safeParse({
        applicantFullName: "Ananya Roy",
        targetSessionLabel: "2026-27",
        targetGradeCode: "XI",
      }).success,
    ).toBe(true);
  });

  it("enforces allowed admission transitions and admissionNumber on enrolled", () => {
    expect(canTransitionAdmissionStatus("enquiry", "submitted")).toBe(true);
    expect(canTransitionAdmissionStatus("approved", "enrolled")).toBe(true);
    expect(canTransitionAdmissionStatus("enquiry", "enrolled")).toBe(false);
    expect(canTransitionAdmissionStatus("enrolled", "rejected")).toBe(false);

    const missingAdmNo = transitionAdmissionSchema.safeParse({
      applicationId: "88888888-8888-4888-8888-888888880901",
      nextStatus: "enrolled",
    });
    expect(missingAdmNo.success).toBe(false);

    const withAdmNo = transitionAdmissionSchema.safeParse({
      applicationId: "88888888-8888-4888-8888-888888880901",
      nextStatus: "enrolled",
      admissionNumber: "ADM-SR-2026-200",
    });
    expect(withAdmNo.success).toBe(true);
  });

  it("rejects malformed custom field keys and select fields without options", () => {
    expect(
      customFieldDefinitionSchema.safeParse({
        entityType: "student",
        fieldKey: "Invalid-Key",
        label: "Bad Key",
        dataType: "text",
      }).success,
    ).toBe(false);

    expect(
      customFieldDefinitionSchema.safeParse({
        entityType: "student",
        fieldKey: "house_color",
        label: "House Color",
        dataType: "select",
        options: [],
      }).success,
    ).toBe(false);

    expect(
      customFieldDefinitionSchema.safeParse({
        entityType: "student",
        fieldKey: "house_color",
        label: "House Color",
        dataType: "select",
        options: ["Tagore", "Ashoka"],
        sensitivityLevel: "standard",
      }).success,
    ).toBe(true);
  });

  it("validates custom field values against data_type and options_json", () => {
    const numResult = validateCustomFieldValue(
      { label: "Siblings", dataType: "number", options: [], isRequired: true },
      "not-a-number",
    );
    expect(numResult.ok).toBe(false);

    const dateResult = validateCustomFieldValue(
      { label: "Last Transfer", dataType: "date", options: [], isRequired: false },
      "2026-04-01",
    );
    expect(dateResult).toEqual({
      ok: true,
      valueText: "2026-04-01",
      valueJson: "2026-04-01",
    });

    const boolResult = validateCustomFieldValue(
      { label: "Transport Required", dataType: "boolean", options: [], isRequired: false },
      "yes",
    );
    expect(boolResult).toEqual({
      ok: true,
      valueText: "true",
      valueJson: true,
    });

    const selectBad = validateCustomFieldValue(
      {
        label: "House",
        dataType: "select",
        options: ["Tagore", "Ashoka"],
        isRequired: true,
      },
      "UnknownHouse",
    );
    expect(selectBad.ok).toBe(false);
  });
});
