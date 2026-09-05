import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/types/database';
import { UserManagementTable } from '@/components/UserManagementTable';
import { Users, ShieldAlert, ShieldCheck, Crown, UserCheck } from 'lucide-react';
import { ROLE_CONFIGS } from '@/lib/permissions';

export const metadata: Metadata = {
  title: 'Benutzerverwaltung | Survivalecke Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const { user: callerUser, profile: callerProfile } = await requireAdmin();

  const supabase = await createClient();

  // Fetch all registered user profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, role, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user profiles:', error);
  }

  const users = (profiles || []) as unknown as Profile[];

  // Calculate statistics
  const stats = {
    total: users.length,
    owner: users.filter((u) => u.role === 'owner').length,
    project_lead: users.filter((u) => u.role === 'project_lead').length,
    admin: users.filter((u) => u.role === 'admin').length,
    moderator: users.filter((u) => u.role === 'moderator').length,
    member: users.filter((u) => u.role === 'member').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#232730] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Benutzer- & Rollenverwaltung</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Verwalte Teammitglieder, Rechte und Benutzerzugänge für Survivalecke
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[11px] text-zinc-400 block">Eingeloggt als</span>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded border inline-block ${
                ROLE_CONFIGS[callerProfile.role]?.badgeColorClass || ''
              }`}
            >
              {ROLE_CONFIGS[callerProfile.role]?.badge || callerProfile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-3">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            Gesamt
          </span>
          <span className="text-xl font-bold text-white mt-1 block">{stats.total}</span>
        </div>

        <div className="bg-[#14161b] border border-amber-900/30 rounded-md p-3">
          <span className="text-[10px] text-amber-400 uppercase tracking-wider block flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Inhaber
          </span>
          <span className="text-xl font-bold text-amber-300 mt-1 block">{stats.owner}</span>
        </div>

        <div className="bg-[#14161b] border border-blue-900/30 rounded-md p-3">
          <span className="text-[10px] text-blue-400 uppercase tracking-wider block">
            Projektleitung
          </span>
          <span className="text-xl font-bold text-blue-300 mt-1 block">
            {stats.project_lead}
          </span>
        </div>

        <div className="bg-[#14161b] border border-purple-900/30 rounded-md p-3">
          <span className="text-[10px] text-purple-400 uppercase tracking-wider block">
            Admin
          </span>
          <span className="text-xl font-bold text-purple-300 mt-1 block">{stats.admin}</span>
        </div>

        <div className="bg-[#14161b] border border-orange-900/30 rounded-md p-3">
          <span className="text-[10px] text-orange-400 uppercase tracking-wider block">
            Moderator
          </span>
          <span className="text-xl font-bold text-orange-300 mt-1 block">
            {stats.moderator}
          </span>
        </div>

        <div className="bg-[#14161b] border border-zinc-800 rounded-md p-3">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
            Spieler
          </span>
          <span className="text-xl font-bold text-zinc-300 mt-1 block">{stats.member}</span>
        </div>
      </div>

      {/* Security Info Card */}
      <div className="bg-[#121419] border border-[#232730] rounded-lg p-4 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center gap-2 text-zinc-200 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Sicherheitsarchitektur & Rollen-Hierarchie</span>
        </div>
        <p className="leading-relaxed">
          Neue Registrierungen erhalten automatisch ausschließlich die Rolle <strong className="text-zinc-200">Mitglied</strong> ohne Zugriff auf das Team-Dashboard. Rollenänderungen werden kryptografisch über Postgres Row Level Security und Server-Aktionen autorisiert und manipulationssicher im Audit-Log protokolliert.
        </p>
      </div>

      {/* Interactive User Table */}
      <UserManagementTable
        users={users}
        currentCaller={callerProfile}
        totalOwners={stats.owner}
      />
    </div>
  );
}
