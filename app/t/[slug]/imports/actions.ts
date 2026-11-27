"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { RegistryActionState } from "@/components/registry/RegistryActionForm";
import {
  IMPORT_DATA_TYPES,
  IMPORT_FIELD_SPECS,
  type ImportDataType,
} from "@/lib/imports/validators";
import {
  authorizeImportOperator,
  cancelImportBatch,
  commitImportBatch,
  stageImportBatch,
  validateImportBatch,
} from "@/server/imports/service";

function fieldString(formData: FormData, key: string): string {
  const val = formData.get(key);
  return typeof val === "string" ? val.trim() : "";
}

function revalidateImportRoutes(slug: string, batchId?: string): void {
  const safeSlug = encodeURIComponent(slug);
  revalidatePath(`/t/${safeSlug}/imports`);
  if (batchId) {
    revalidatePath(`/t/${safeSlug}/imports/${batchId}`);
  }
}

export async function stageImportBatchAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const auth = await authorizeImportOperator(slug);
  if (!auth.ok) {
    return { status: "error", message: `Authorization failed: ${auth.reason}` };
  }

  const rawDataType = fieldString(formData, "dataType") as ImportDataType;
  if (!IMPORT_DATA_TYPES.includes(rawDataType)) {
    return { status: "error", message: "Select a valid import data type." };
  }

  const idempotencyKey = fieldString(formData, "idempotencyKey");
  const uploadedFile = formData.get("file");
  if (!(uploadedFile instanceof File) || uploadedFile.size === 0) {
    return {
      status: "error",
      message: "Choose a non-empty .csv or .xlsx file to stage.",
    };
  }

  const arrayBuffer = await uploadedFile.arrayBuffer();
  const res = await stageImportBatch(auth.context, {
    dataType: rawDataType,
    filename: uploadedFile.name,
    buffer: Buffer.from(arrayBuffer),
    idempotencyKey,
  });

  if (!res.ok) {
    return { status: "error", message: res.error };
  }

  revalidateImportRoutes(slug, res.data.batchId);
  redirect(
    `/t/${encodeURIComponent(auth.context.institutionSlug)}/imports/${res.data.batchId}`,
  );
}

export async function validateImportBatchAction(
  slug: string,
  batchId: string,
  dataType: ImportDataType,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const auth = await authorizeImportOperator(slug);
  if (!auth.ok) {
    return { status: "error", message: `Authorization failed: ${auth.reason}` };
  }

  const specs = IMPORT_FIELD_SPECS[dataType];
  if (!specs) {
    return { status: "error", message: "Unsupported import batch type." };
  }

  const columnMapping: Record<string, string> = {};
  for (const spec of specs) {
    const selectedHeader = fieldString(formData, `map_${spec.key}`);
    if (selectedHeader.length > 0) {
      columnMapping[spec.key] = selectedHeader;
    }
  }

  const res = await validateImportBatch(auth.context, batchId, columnMapping);
  if (!res.ok) {
    return { status: "error", message: res.error };
  }

  revalidateImportRoutes(slug, batchId);
  return {
    status: "success",
    message: `Dry-run complete (${res.data.totalRows} rows): ${res.data.validRows} valid, ${res.data.duplicateRows} duplicate, ${res.data.errorRows} error(s).`,
  };
}

export async function commitImportBatchAction(
  slug: string,
  batchId: string,
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const auth = await authorizeImportOperator(slug);
  if (!auth.ok) {
    return { status: "error", message: `Authorization failed: ${auth.reason}` };
  }

  const res = await commitImportBatch(auth.context, batchId);
  if (!res.ok) {
    return { status: "error", message: res.error };
  }

  const safeSlug = encodeURIComponent(slug);
  revalidateImportRoutes(slug, batchId);
  revalidatePath(`/t/${safeSlug}/people`);
  revalidatePath(`/t/${safeSlug}/people/staff`);
  revalidatePath(`/t/${safeSlug}/academics`);

  return {
    status: "success",
    message: res.data.alreadyCommitted
      ? `Batch was already committed previously (${res.data.committedRows} rows created, zero duplicates written).`
      : `Committed ${res.data.committedRows} valid rows cleanly (${res.data.skippedRows} duplicate/error rows skipped).`,
  };
}

export async function cancelImportBatchAction(
  slug: string,
  batchId: string,
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const auth = await authorizeImportOperator(slug);
  if (!auth.ok) {
    return { status: "error", message: `Authorization failed: ${auth.reason}` };
  }

  const res = await cancelImportBatch(auth.context, batchId);
  if (!res.ok) {
    return { status: "error", message: res.error };
  }

  revalidateImportRoutes(slug, batchId);
  return { status: "success", message: "Staged batch cancelled." };
}
