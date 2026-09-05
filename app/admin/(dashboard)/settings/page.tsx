import { createClient } from '@/lib/supabase/server';
import { ShieldCheck, Server, Users, ArrowRight } from 'lucide-react';
import type { Profile } from '@/types/database';
import { ROLE_CONFIGS, isStaffRole } from '@/lib/permissions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  // Fetch all user profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: true });

  const allUsers = (profiles || []) as unknown as Profile[];
  const staffUsers = allUsers.filter((u) => isStaffRole(u.role));

  return (
    <div className="space-y-6">
      <div className="border-b border-[#232730] pb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          System-Einstellungen & Status
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Technische Konfiguration und Team-Übersicht der Survivalecke Mod-Datenbank
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Information */}
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#20242e] pb-3">
            <Server className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Systemumgebung
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-[#1c1f26]">
              <span className="text-zinc-400">Server-Name</span>
              <span className="font-semibold text-zinc-100">Survivalecke</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#1c1f26]">
              <span className="text-zinc-400">Plattform</span>
              <span className="font-mono text-zinc-200">Next.js (App Router)</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#1c1f26]">
              <span className="text-zinc-400">Datenbank-Engine</span>
              <span className="font-mono text-zinc-200">PostgreSQL (Supabase)</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#1c1f26]">
              <span className="text-zinc-400">Row Level Security (RLS)</span>
              <span className="text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Aktiviert (Strenges RBAC)</span>
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#1c1f26]">
              <span className="text-zinc-400">Hosting-Optimierung</span>
              <span className="font-mono text-zinc-200">Vercel Production</span>
            </div>
          </div>
        </div>

        {/* Team Accounts */}
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#20242e] pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-zinc-200">
                Team-Mitglieder ({staffUsers.length})
              </h2>
            </div>
            <Link
              href="/admin/users"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              <span>Verwalten</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {staffUsers.length > 0 ? (
            <ul className="divide-y divide-[#1e222a] text-xs">
              {staffUsers.map((member) => {
                const config = ROLE_CONFIGS[member.role] || ROLE_CONFIGS.member;
                return (
                  <li key={member.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-zinc-200">{member.email}</span>
                      <span className="block text-[10px] text-zinc-400 font-mono">
                        ID: {member.id.slice(0, 8)}...
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${config.badgeColorClass}`}
                    >
                      {config.badge}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-xs text-zinc-400">
              Keine Teammitglieder registriert.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
