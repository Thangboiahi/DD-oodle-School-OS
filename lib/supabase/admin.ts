import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseSecretEnv } from "@/lib/supabase/env";

/**
 * Creates a privileged Supabase client using SUPABASE_SECRET_KEY.
 *
 * SECURITY WARNING: This client BYPASSES PostgreSQL Row Level Security (RLS).
 * Callers MUST explicitly authenticate the actor, verify active institution
 * membership and permissions, and write audit_events where appropriate before
 * performing any mutation or cross-tenant read.
 */
export function createSupabaseAdminClient() {
  const { url, secretKey } = getServerSupabaseSecretEnv();

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
