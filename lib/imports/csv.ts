export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_COLUMNS = 60;

export interface ParsedTabularSheet {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * RFC-4180 compliant CSV parser with UTF-8 BOM stripping and strict safety caps:
 * - 5 MB maximum byte payload
 * - 5,000 maximum data rows
 * - 60 maximum columns
 */
export function parseCsvText(
  rawText: string,
  byteLength: number = Buffer.byteLength(rawText, "utf8"),
): ParsedTabularSheet {
  if (byteLength > MAX_IMPORT_FILE_BYTES) {
    throw new Error("Import file exceeds the 5 MB maximum upload limit.");
  }

  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
  if (text.trim().length === 0) {
    throw new Error("CSV file is empty.");
  }

  const records: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      if (currentField.length > 0) {
        throw new Error(
          `Unexpected quote inside unquoted CSV field on row ${records.length + 1}.`,
        );
      }
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.length >= MAX_IMPORT_COLUMNS) {
        throw new Error(
          `CSV exceeds maximum supported column count (${MAX_IMPORT_COLUMNS}).`,
        );
      }
      continue;
    }

    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && next === "\n") {
        i += 1;
      }
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.some((cell) => cell.trim().length > 0)) {
        records.push(currentRow);
        if (records.length - 1 > MAX_IMPORT_ROWS) {
          throw new Error(
            `CSV exceeds maximum supported data row cap (${MAX_IMPORT_ROWS}).`,
          );
        }
      }
      currentRow = [];
      continue;
    }

    currentField += ch;
  }

  if (inQuotes) {
    throw new Error("CSV contains an unclosed quoted field.");
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((cell) => cell.trim().length > 0)) {
      records.push(currentRow);
    }
  }

  if (records.length === 0) {
    throw new Error("CSV header row is missing.");
  }

  const headerRow = records[0]!;
  if (headerRow.length > MAX_IMPORT_COLUMNS) {
    throw new Error(
      `CSV exceeds maximum supported column count (${MAX_IMPORT_COLUMNS}).`,
    );
  }

  const headers = headerRow.map((h) => h.trim()).filter((h) => h.length > 0);
  if (headers.length === 0 || headers.length !== headerRow.length) {
    throw new Error("Every CSV header column must have a non-blank name.");
  }

  const seenHeaders = new Set<string>();
  for (const header of headers) {
    const lower = header.toLowerCase();
    if (seenHeaders.has(lower)) {
      throw new Error(`Duplicate CSV column header detected: "${header}".`);
    }
    seenHeaders.add(lower);
  }

  const dataRecords = records.slice(1);
  if (dataRecords.length === 0) {
    throw new Error("CSV contains headers but zero data rows.");
  }
  if (dataRecords.length > MAX_IMPORT_ROWS) {
    throw new Error(
      `CSV exceeds maximum supported data row cap (${MAX_IMPORT_ROWS}).`,
    );
  }

  const rows: Record<string, string>[] = dataRecords.map((cells) => {
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c += 1) {
      obj[headers[c]!] = (cells[c] ?? "").trim();
    }
    return obj;
  });

  return { headers, rows };
}

/**
 * Neutralizes spreadsheet formula injection (CWE-1236) on exported cells
 * by prefixing leading `=`, `+`, `-`, `@`, `\t`, or `\r` with `'`.
 */
export function neutralizeCsvFormula(raw: string): string {
  if (raw.length === 0) return "";
  return /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
}

function escapeCsvCell(value: unknown): string {
  const stringified =
    value === null || value === undefined ? "" : String(value);
  const safe = neutralizeCsvFormula(stringified);
  if (/[",\r\n]/.test(safe) || safe !== stringified) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function serializeCsvSafely(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  const lines = [headers.map((h) => escapeCsvCell(h)).join(",")];
  for (const row of rows) {
    lines.push(row.map((cell) => escapeCsvCell(cell)).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}
