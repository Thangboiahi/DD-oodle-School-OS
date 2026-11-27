"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sanitizeNextPath } from "@/lib/auth/safe-redirect";
import { getOptionalPublicSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  next: z.string().optional(),
});

export interface SignInActionState {
  error: string | null;
}

export async function signInAction(
  _prevState: SignInActionState,
  formData: FormData,
): Promise<SignInActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: typeof formData.get("next") === "string" ? formData.get("next") : undefined,
  });

  if (!parsed.success) {
    return {
      error: "Please enter a valid email address and password.",
    };
  }

  const env = getOptionalPublicSupabaseEnv();
  if (!env) {
    return {
      error:
        "Supabase authentication is not configured in this environment yet.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Deliberately generic error to avoid account/email enumeration.
    return {
      error: "Invalid email or password. Please verify your credentials.",
    };
  }

  const destination = sanitizeNextPath(parsed.data.next, "/workspace");
  redirect(destination);
}
