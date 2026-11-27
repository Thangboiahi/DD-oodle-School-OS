import { describe, expect, it } from "vitest";
import {
  MAX_IMPORT_COLUMNS,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  neutralizeCsvFormula,
  parseCsvText,
  serializeCsvSafely,
} from "@/lib/imports/csv";
import {
  suggestColumnMapping,
  validateImportRows,
} from "@/lib/imports/validators";

describe("RFC-4180 CSV parser & formula neutralization", () => {
  it("parses UTF-8 BOM, CRLF/LF, quoted commas, and escaped double quotes", () => {
    const csv =
      '\uFEFFadmission_number,full_name,email\r\n"ADM-01","Rao, ""Aarav""","aarav@example.test"\nADM-02,Diya Nair,diya@example.test\r\n';
    const parsed = parseCsvText(csv);
    expect(parsed.headers).toEqual(["admission_number", "full_name", "email"]);
    expect(parsed.rows).toEqual([
      {
        admission_number: "ADM-01",
        full_name: 'Rao, "Aarav"',
        email: "aarav@example.test",
      },
      {
        admission_number: "ADM-02",
        full_name: "Diya Nair",
        email: "diya@example.test",
      },
    ]);
  });

  it("enforces 5 MB byte limit, 5,000-row cap, and 60-column cap", () => {
    expect(() =>
      parseCsvText("a,b\n1,2\n", MAX_IMPORT_FILE_BYTES + 1),
    ).toThrow(/5 MB/i);

    const tooManyColsHeader = Array.from(
      { length: MAX_IMPORT_COLUMNS + 1 },
      (_, idx) => `c${idx}`,
    ).join(",");
    expect(() => parseCsvText(`${tooManyColsHeader}\n1\n`)).toThrow(/60/);

    const rows = Array.from(
      { length: MAX_IMPORT_ROWS + 1 },
      (_, idx) => `ADM-${idx},Student ${idx}`,
    ).join("\n");
    expect(() => parseCsvText(`admission_number,full_name\n${rows}`)).toThrow(
      /5000|5,000/i,
    );
  });

  it("neutralizes spreadsheet formula prefixes in exported CSV reports", () => {
    expect(neutralizeCsvFormula("=CMD()")).toBe("'=CMD()");
    expect(neutralizeCsvFormula("+SUM(1,2)")).toBe("'+SUM(1,2)");
    expect(neutralizeCsvFormula("-1+1")).toBe("'-1+1");
    expect(neutralizeCsvFormula("@HYPERLINK")).toBe("'@HYPERLINK");
    expect(neutralizeCsvFormula("\t=1")).toBe("'\t=1");
    expect(neutralizeCsvFormula("\r=1")).toBe("'\r=1");

    const serialized = serializeCsvSafely(
      ["row_number", "value"],
      [
        [1, '=HYPERLINK("http://evil.example")'],
        [2, "Safe Student"],
      ],
    );
    expect(serialized).toContain('"\'=HYPERLINK(""http://evil.example"")"');
    expect(serialized).toContain("2,Safe Student");
  });
});

describe("Bulk import mapping, duplicate & Aadhaar validation", () => {
  it("classifies partial valid, duplicate (in-file & DB), and invalid rows accurately", () => {
    const headers = [
      "admission_number",
      "full_name",
      "email",
      "pen_number",
    ];
    const mapping = suggestColumnMapping(headers, "students");
    expect(mapping).toEqual({
      admission_number: "admission_number",
      full_name: "full_name",
      email: "email",
      pen_number: "pen_number",
    });

    const result = validateImportRows({
      dataType: "students",
      columnMapping: mapping,
      existingLookup: {
        existingAdmissionNumbers: new Set(["adm-sr-2026-001"]),
      },
      rows: [
        {
          rowNumber: 1,
          rawPayload: {
            admission_number: "ADM-SR-2026-101",
            full_name: "Meera Joshi",
            email: "meera@example.test",
            pen_number: "12345678901",
          },
        },
        {
          rowNumber: 2,
          rawPayload: {
            admission_number: "ADM-SR-2026-101",
            full_name: "Meera Duplicate",
            email: "",
            pen_number: "",
          },
        },
        {
          rowNumber: 3,
          rawPayload: {
            admission_number: "ADM-SR-2026-001",
            full_name: "Existing DB Student",
            email: "",
            pen_number: "",
          },
        },
        {
          rowNumber: 4,
          rawPayload: {
            admission_number: "",
            full_name: "X",
            email: "bad-email",
            pen_number: "BADPEN",
          },
        },
      ],
    });

    expect(result.forbiddenAadhaarColumns).toEqual([]);
    expect(result.validCount).toBe(1);
    expect(result.duplicateCount).toBe(2);
    expect(result.errorCount).toBe(1);
    expect(result.rows.map((r) => r.validationStatus)).toEqual([
      "valid",
      "duplicate",
      "duplicate",
      "error",
    ]);
  });

  it("rejects any spreadsheet or mapping referencing Aadhaar/Aadhar", () => {
    const result = validateImportRows({
      dataType: "students",
      columnMapping: {
        admission_number: "admission_number",
        full_name: "full_name",
      },
      existingLookup: {},
      rows: [
        {
          rowNumber: 1,
          rawPayload: {
            admission_number: "ADM-NEW-1",
            full_name: "Ananya Sen",
            aadhaar_number: "123412341234",
          },
        },
      ],
    });

    expect(result.forbiddenAadhaarColumns).toEqual(["aadhaar_number"]);
    expect(result.validCount).toBe(0);
    expect(result.errorCount).toBe(1);
    expect(result.rows[0]?.errors[0]).toMatch(/Aadhaar/i);

    const mappedAadhar = validateImportRows({
      dataType: "students",
      columnMapping: {
        admission_number: "admission_number",
        full_name: "full_name",
        pen_number: "aadhar_id",
      },
      existingLookup: {},
      rows: [
        {
          rowNumber: 1,
          rawPayload: {
            admission_number: "ADM-NEW-2",
            full_name: "Test Student",
            aadhar_id: "123412341234",
          },
        },
      ],
    });
    expect(mappedAadhar.forbiddenAadhaarColumns).toEqual(["aadhar_id"]);
    expect(mappedAadhar.validCount).toBe(0);
  });

  it("validates staff and subject_enrolments against DB session/offering references", () => {
    const staffResult = validateImportRows({
      dataType: "staff",
      columnMapping: {
        employee_code: "employee_code",
        full_name: "full_name",
        designation: "designation",
      },
      existingLookup: {
        existingEmployeeCodes: new Set(["emp-001"]),
      },
      rows: [
        {
          rowNumber: 1,
          rawPayload: {
            employee_code: "EMP-001",
            full_name: "Existing Staff",
            designation: "PGT Physics",
          },
        },
        {
          rowNumber: 2,
          rawPayload: {
            employee_code: "EMP-202",
            full_name: "Neha Kulkarni",
            designation: "PGT Chemistry",
          },
        },
      ],
    });

    expect(staffResult.duplicateCount).toBe(1);
    expect(staffResult.validCount).toBe(1);

    const subjResult = validateImportRows({
      dataType: "subject_enrolments",
      columnMapping: {
        admission_number: "admission_number",
        session_code: "session_code",
        subject_code: "subject_code",
        enrolment_kind: "enrolment_kind",
      },
      existingLookup: {
        studentEnrolmentByAdmissionAndSession: new Map([
          [
            "adm-sr-2026-001::2026-27",
            {
              studentEnrolmentId: "enr-1",
              sessionId: "sess-1",
              gradeLevelId: "grade-xi",
            },
          ],
        ]),
        offeringBySessionGradeAndSubject: new Map([
          ["sess-1::grade-xi::cs-083", "off-cs"],
        ]),
        existingSubjectEnrolmentKeys: new Set(),
      },
      rows: [
        {
          rowNumber: 1,
          rawPayload: {
            admission_number: "ADM-SR-2026-001",
            session_code: "2026-27",
            subject_code: "CS-083",
            enrolment_kind: "elective",
          },
        },
        {
          rowNumber: 2,
          rawPayload: {
            admission_number: "ADM-MISSING",
            session_code: "2026-27",
            subject_code: "CS-083",
            enrolment_kind: "elective",
          },
        },
      ],
    });

    expect(subjResult.validCount).toBe(1);
    expect(subjResult.errorCount).toBe(1);
  });
});
