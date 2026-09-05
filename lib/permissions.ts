import type { UserRole } from '@/types/database';

export interface RoleConfig {
  role: UserRole;
  label: string;
  badge: string;
  description: string;
  badgeColorClass: string;
  textColorClass: string;
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  owner: {
    role: 'owner',
    label: 'Inhaber',
    badge: '👑 Inhaber',
    description: 'Volle administrative Kontrolle, Systemverwaltung, Rollenverwaltung aller Ebenen.',
    badgeColorClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    textColorClass: 'text-amber-400',
  },
  project_lead: {
    role: 'project_lead',
    label: 'Projektleitung',
    badge: '🔵 Projektleitung',
    description: 'Verwaltung von Mods, Regeln, System-Einstellungen und Rollen bis Admin.',
    badgeColorClass: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    textColorClass: 'text-blue-400',
  },
  admin: {
    role: 'admin',
    label: 'Admin',
    badge: '🟣 Admin',
    description: 'Verwaltung von Mods, Versionen, Vorschlägen sowie Rollen bis Moderator.',
    badgeColorClass: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    textColorClass: 'text-purple-400',
  },
  moderator: {
    role: 'moderator',
    label: 'Moderator',
    badge: '🟠 Moderator',
    description: 'Bearbeitung und Prüfung von Mod-Vorschlägen. Kein Zugriff auf Rollenverwaltung.',
    badgeColorClass: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    textColorClass: 'text-orange-400',
  },
  member: {
    role: 'member',
    label: 'Mitglied',
    badge: '⚪ Mitglied',
    description: 'Reguläres Spieler-Konto. Kein Zugriff auf das Team-Dashboard oder Admin-APIs.',
    badgeColorClass: 'bg-zinc-800 border-zinc-700 text-zinc-300',
    textColorClass: 'text-zinc-400',
  },
};

export const ALL_ROLES: UserRole[] = [
  'owner',
  'project_lead',
  'admin',
  'moderator',
  'member',
];

export const STAFF_ROLES: UserRole[] = [
  'owner',
  'project_lead',
  'admin',
  'moderator',
];

export const ADMIN_ROLES: UserRole[] = [
  'owner',
  'project_lead',
  'admin',
];

export function isStaffRole(role?: string | null): boolean {
  if (!role) return false;
  return STAFF_ROLES.includes(role as UserRole);
}

export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  return ADMIN_ROLES.includes(role as UserRole);
}

export function isOwnerRole(role?: string | null): boolean {
  return role === 'owner';
}

export function canManageUsers(role?: string | null): boolean {
  if (!role) return false;
  return ADMIN_ROLES.includes(role as UserRole);
}

/**
 * Determines which roles a caller is permitted to assign to other users.
 */
export function getAssignableRolesForCaller(callerRole?: string | null): UserRole[] {
  if (!callerRole) return [];
  switch (callerRole) {
    case 'owner':
      return ['owner', 'project_lead', 'admin', 'moderator', 'member'];
    case 'project_lead':
      return ['admin', 'moderator', 'member'];
    case 'admin':
      return ['moderator', 'member'];
    default:
      return [];
  }
}

/**
 * Validates whether the caller can change the target user's role to newRole.
 */
export function validateRoleChange({
  callerId,
  callerRole,
  targetId,
  targetRole,
  newRole,
  totalOwners = 1,
}: {
  callerId: string;
  callerRole: UserRole;
  targetId: string;
  targetRole: UserRole;
  newRole: UserRole;
  totalOwners?: number;
}): { allowed: boolean; reason?: string } {
  // 1. Prevent self-modification
  if (callerId === targetId) {
    return {
      allowed: false,
      reason: 'Du kannst deine eigene Rolle nicht verändern.',
    };
  }

  // 2. Caller must be an admin role
  if (!ADMIN_ROLES.includes(callerRole)) {
    return {
      allowed: false,
      reason: 'Du hast keine Berechtigung zur Rollenverwaltung.',
    };
  }

  // 3. Hierarchy restrictions for Admin
  if (callerRole === 'admin') {
    if (['owner', 'project_lead', 'admin'].includes(targetRole)) {
      return {
        allowed: false,
        reason: 'Admins können Inhaber, Projektleiter oder andere Admins nicht bearbeiten.',
      };
    }
    if (!['moderator', 'member'].includes(newRole)) {
      return {
        allowed: false,
        reason: 'Admins dürfen nur die Rollen Moderator oder Mitglied vergeben.',
      };
    }
  }

  // 4. Hierarchy restrictions for Project Lead
  if (callerRole === 'project_lead') {
    if (targetRole === 'owner') {
      return {
        allowed: false,
        reason: 'Projektleiter können den Inhaber nicht bearbeiten.',
      };
    }
    if (newRole === 'owner') {
      return {
        allowed: false,
        reason: 'Projektleiter dürfen die Rolle Inhaber nicht vergeben.',
      };
    }
  }

  // 5. Last owner protection
  if (targetRole === 'owner' && newRole !== 'owner' && totalOwners <= 1) {
    return {
      allowed: false,
      reason: 'Der letzte Inhaber kann nicht entfernt oder herabgestuft werden.',
    };
  }

  return { allowed: true };
}
