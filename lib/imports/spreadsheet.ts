import { readSheet } from "read-excel-file/node";
import {
  MAX_IMPORT_COLUMNS,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  parseCsvText,
  type ParsedTabularSheet,
} from "@/lib/imports/csv";

export type SupportedImportFormat = "csv" | "xlsx";

export interface ParsedSpreadsheetResult extends ParsedTabularSheet {
  format: SupportedImportFormat;
}

function formatXlsxCell(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) {
    if (Number.isNaN(cell.getTime())) return "";
    return cell.toISOString().slice(0, 10);
  }
  if (typeof cell === "boolean") {
    return cell ? "true" : "false";
  }
  if (typeof cell === "number") {
    return Number.isFinite(cell) ? String(cell) : "";
  }
  return String(cell).trim();
}

export function detectImportFormat(
  filename: string,
): SupportedImportFormat | null {
  const lower = filename.trim().toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx")) return "xlsx";
  return null;
}

/**
 * Unified spreadsheet parser supporting `.csv` (RFC-4180) and `.xlsx` (via
 * `read-excel-file/node`, avoiding legacy `xlsx` CVEs), enforcing 5 MB,
 * 5,000-row, and 60-column limits.
 */
export async function parseSpreadsheetBuffer(input: {
  buffer: Buffer;
  filename: string;
}): Promise<ParsedSpreadsheetResult> {
  const format = detectImportFormat(input.filename);
  if (!format) {
    throw new Error(
      "Unsupported file extension. Upload a .csv or .xlsx spreadsheet.",
    );
  }

  if (input.buffer.byteLength === 0) {
    throw new Error("Uploaded file is empty.");
  }

  if (input.buffer.byteLength > MAX_IMPORT_FILE_BYTES) {
    throw new Error("Import file exceeds the 5 MB maximum upload limit.");
  }

  if (format === "csv") {
    const parsed = parseCsvText(
      input.buffer.toString("utf8"),
      input.buffer.byteLength,
    );
    return { format: "csv", ...parsed };
  }

  const rawMatrix = await readSheet(input.buffer);
  const nonEmptyRows = rawMatrix.filter((row) =>
    row.some((cell) => formatXlsxCell(cell).length > 0),
  );

  if (nonEmptyRows.length === 0) {
    throw new Error("XLSX worksheet is empty.");
  }

  const rawHeaders = nonEmptyRows[0]!.map((cell) => formatXlsxCell(cell));
  if (rawHeaders.length > MAX_IMPORT_COLUMNS) {
    throw new Error(
      `XLSX exceeds maximum supported column count (${MAX_IMPORT_COLUMNS}).`,
    );
  }

  const headers = rawHeaders.filter((h) => h.length > 0);
  if (headers.length === 0 || headers.length !== rawHeaders.length) {
    throw new Error("Every XLSX header column must have a non-blank name.");
  }

  const seenHeaders = new Set<string>();
  for (const header of headers) {
    const lower = header.toLowerCase();
    if (seenHeaders.has(lower)) {
      throw new Error(`Duplicate XLSX column header detected: "${header}".`);
    }
    seenHeaders.add(lower);
  }

  const dataRows = nonEmptyRows.slice(1);
  if (dataRows.length === 0) {
    throw new Error("XLSX contains headers but zero data rows.");
  }
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new Error(
      `XLSX exceeds maximum supported data row cap (${MAX_IMPORT_ROWS}).`,
    );
  }

  const rows: Record<string, string>[] = dataRows.map((cells) => {
    const record: Record<string, string> = {};
    for (let c = 0; c < headers.length; c += 1) {
      record[headers[c]!] = formatXlsxCell(cells[c]);
    }
    return record;
  });

  return { format: "xlsx", headers, rows };
}
