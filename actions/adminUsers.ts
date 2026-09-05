'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/types/database';
import {
  ALL_ROLES,
  validateRoleChange,
} from '@/lib/permissions';

export interface UpdateRoleResult {
  success: boolean;
  error?: string;
}

export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole
): Promise<UpdateRoleResult> {
  try {
    // 1. Authenticate caller (must be owner, project_lead, or admin)
    const { user: callerUser, profile: callerProfile } = await requireAdmin();

    if (!ALL_ROLES.includes(newRole)) {
      return { success: false, error: `Ungültige Rolle: ${newRole}` };
    }

    const supabase = await createClient();

    // 2. Fetch target user profile
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return { success: false, error: 'Benutzer nicht gefunden.' };
    }

    // 3. Check owner count for safety
    let totalOwners = 1;
    if (targetProfile.role === 'owner') {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'owner');
      totalOwners = count ?? 1;
    }

    // 4. Validate in Application Layer
    const validation = validateRoleChange({
      callerId: callerUser.id,
      callerRole: callerProfile.role,
      targetId: targetProfile.id,
      targetRole: targetProfile.role as UserRole,
      newRole,
      totalOwners,
    });

    if (!validation.allowed) {
      return { success: false, error: validation.reason || 'Aktion nicht gestattet.' };
    }

    // 5. Execute secure Postgres RPC (which enforces RLS + constraints + audit log)
    const { data, error: rpcError } = await supabase.rpc('assign_user_role', {
      target_user_id: targetUserId,
      new_role: newRole,
    });

    if (rpcError) {
      console.error('assign_user_role RPC error:', rpcError);
      return { success: false, error: rpcError.message || 'Fehler beim Ändern der Rolle.' };
    }

    // 6. Revalidate pages
    revalidatePath('/admin/users');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/audit');

    return { success: true };
  } catch (err: unknown) {
    console.error('updateUserRole error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten.',
    };
  }
}
