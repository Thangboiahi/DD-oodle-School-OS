"use server";

import { revalidatePath } from "next/cache";
import type { RegistryActionState } from "@/components/registry/RegistryActionForm";
import {
  acknowledgeHandbookEntry,
  archiveHandbookEntry,
  createHandbookEntry,
  updateHandbookEntry,
} from "@/server/handbook/service";

function fieldString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateHandbookRoutes(slug: string, studentProfileId: string) {
  const encodedSlug = encodeURIComponent(slug);
  const encodedStudent = encodeURIComponent(studentProfileId);
  revalidatePath(`/t/${encodedSlug}/handbook`);
  revalidatePath(`/t/${encodedSlug}/handbook/${encodedStudent}`);
}

export async function createHandbookEntryAction(
  slug: string,
  studentProfileId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createHandbookEntry(slug, {
    studentProfileId,
    category: fieldString(formData, "category"),
    visibilityScope: fieldString(formData, "visibilityScope"),
    teachingGroupId: fieldString(formData, "teachingGroupId"),
    title: fieldString(formData, "title"),
    body: fieldString(formData, "body"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateHandbookRoutes(slug, studentProfileId);
  return {
    status: "success",
    message: "Handbook entry recorded cleanly.",
  };
}

export async function updateHandbookEntryAction(
  slug: string,
  studentProfileId: string,
  entryId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await updateHandbookEntry(slug, {
    entryId,
    studentProfileId,
    title: fieldString(formData, "title"),
    body: fieldString(formData, "body"),
    visibilityScope: fieldString(formData, "visibilityScope"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateHandbookRoutes(slug, studentProfileId);
  return {
    status: "success",
    message: "Handbook entry updated.",
  };
}

export async function archiveHandbookEntryAction(
  slug: string,
  studentProfileId: string,
  entryId: string,
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await archiveHandbookEntry(slug, {
    entryId,
    studentProfileId,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateHandbookRoutes(slug, studentProfileId);
  return {
    status: "success",
    message: "Handbook entry archived.",
  };
}

export async function acknowledgeHandbookEntryAction(
  slug: string,
  studentProfileId: string,
  entryId: string,
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await acknowledgeHandbookEntry(slug, {
    entryId,
    studentProfileId,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateHandbookRoutes(slug, studentProfileId);
  return {
    status: "success",
    message: "Acknowledged as linked guardian.",
  };
}
