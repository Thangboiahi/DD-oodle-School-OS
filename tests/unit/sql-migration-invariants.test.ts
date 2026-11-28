import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readAllFilesRecursively(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...readAllFilesRecursively(full));
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

describe("SQL migrations and client secret invariants", () => {
  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const combinedSql = migrationFiles
    .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
    .join("\n");

  it("enables and forces RLS on every CREATE TABLE public.* table", () => {
    const tableMatches = [
      ...combinedSql.matchAll(/CREATE TABLE\s+public\.([a-z0-9_]+)/gi),
    ];
    expect(tableMatches.length).toBe(45);

    for (const match of tableMatches) {
      const tableName = match[1];
      expect(combinedSql).toMatch(
        new RegExp(`ALTER TABLE\\s+public\\.${tableName}\\s+ENABLE ROW LEVEL SECURITY`, "i"),
      );
      expect(combinedSql).toMatch(
        new RegExp(`ALTER TABLE\\s+public\\.${tableName}\\s+FORCE ROW LEVEL SECURITY`, "i"),
      );
    }
  });

  it("locks search_path on every SECURITY DEFINER function and revokes app_auth from anon/PUBLIC", () => {
    const definerBlocks = combinedSql.split(/SECURITY DEFINER/i).slice(1);
    expect(definerBlocks.length).toBeGreaterThanOrEqual(10);

    for (const block of definerBlocks) {
      const headerSlice = block.slice(0, 120);
      expect(headerSlice).toMatch(/SET\s+search_path\s*=\s*''/i);
    }

    expect(combinedSql).toMatch(
      /REVOKE ALL ON SCHEMA app_auth FROM PUBLIC,\s*anon/i,
    );
  });

  it("keeps institution-private storage bucket private", () => {
    expect(combinedSql).toMatch(
      /'institution-private',\s*'institution-private',\s*false/i,
    );
  });

  it("never references forbidden legacy or leaked secret keys in app/ or lib/", () => {
    const appFiles = readAllFilesRecursively(path.resolve(process.cwd(), "app"));
    const libFiles = readAllFilesRecursively(path.resolve(process.cwd(), "lib"));
    for (const file of [...appFiles, ...libFiles]) {
      const content = fs.readFileSync(file, "utf8");
      expect(content).not.toContain("NEXT_PUBLIC_SUPABASE_SECRET");
      expect(content).not.toContain("SERVICE_ROLE");
    }
  });
});
