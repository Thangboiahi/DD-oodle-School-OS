import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditEventPayload {
  institutionId: string;
  actorPersonId: string;
  actorAuthUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Appends an immutable audit log entry via the caller's RLS-enforced client.
 */
export async function recordAuditEvent(
  supabase: SupabaseClient,
  payload: AuditEventPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("audit_events").insert({
    institution_id: payload.institutionId,
    actor_person_id: payload.actorPersonId,
    actor_auth_user_id: payload.actorAuthUserId,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    reason: payload.reason ?? null,
    before_state: payload.beforeState ?? null,
    after_state: payload.afterState ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
