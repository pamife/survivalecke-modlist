import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import type { Json } from '@/types/database';

export interface AuditLogParams {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export async function logAuditEvent({
  action,
  entityType,
  entityId = null,
  entityName = null,
  oldValues = null,
  newValues = null,
}: AuditLogParams) {
  try {
    const user = await getCurrentUser();
    const supabase = await createClient();

    await supabase.from('audit_logs').insert({
      user_id: user?.id ?? null,
      user_email: user?.email ?? 'System / Anonymous',
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      old_values: (oldValues as Json) || null,
      new_values: (newValues as Json) || null,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
