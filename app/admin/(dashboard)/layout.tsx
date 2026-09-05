import { requireStaff } from '@/lib/auth';
import Link from 'next/link';
import { signOutAdmin } from '@/actions/adminAuth';
import {
  LayoutDashboard,
  Boxes,
  Inbox,
  History,
  Settings,
  Users,
  LogOut,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import type { Metadata } from 'next';
import { ROLE_CONFIGS, canManageUsers } from '@/lib/permissions';

export const metadata: Metadata = {
  title: {
    template: '%s | Survivalecke Admin',
    default: 'Admin Dashboard | Survivalecke',
  },
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireStaff();
  const roleConfig = ROLE_CONFIGS[profile.role] || ROLE_CONFIGS.member;

  return (
    <div className="min-h-full flex flex-col bg-[#0b0c0f]">
      {/* Top Admin Bar */}
      <div className="border-b border-[#232730] bg-[#121419] px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.webp"
              alt="Survivalecke"
              className="w-7 h-7 object-contain drop-shadow-sm shrink-0"
            />
            <span className="font-bold text-sm text-white">Survivalecke</span>
            <span className="text-[10px] font-mono uppercase bg-zinc-800 border border-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
              Team
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-zinc-200 font-medium">{user.email}</span>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${roleConfig.badgeColorClass}`}
              >
                {roleConfig.badge}
              </span>
            </div>
          </div>

          <Link
            href="/"
            target="_blank"
            className="hidden md:inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
          >
            <span>Öffentliche Seite</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <form action={signOutAdmin}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Abmelden</span>
            </button>
          </form>
        </div>
      </div>

      {/* Admin Secondary Navigation */}
      <div className="border-b border-[#1f232c] bg-[#101216] px-4 sm:px-6">
        <nav className="max-w-6xl mx-auto flex items-center gap-1 overflow-x-auto py-2 text-xs">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors shrink-0"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-zinc-400" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/admin/mods"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors shrink-0"
          >
            <Boxes className="w-3.5 h-3.5 text-zinc-400" />
            <span>Mods verwalten</span>
          </Link>

          <Link
            href="/admin/suggestions"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors shrink-0"
          >
            <Inbox className="w-3.5 h-3.5 text-zinc-400" />
            <span>Vorschläge</span>
          </Link>

          {canManageUsers(profile.role) && (
            <Link
              href="/admin/users"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors shrink-0"
            >
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Benutzer</span>
            </Link>
          )}

          <Link
            href="/admin/audit"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors shrink-0"
          >
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span>Audit-Log</span>
          </Link>

          <Link
            href="/admin/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors shrink-0"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Einstellungen</span>
          </Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
