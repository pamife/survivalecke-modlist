import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import {
  Inbox,
  History,
  PlusCircle,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import type { AuditLog, ModSuggestion } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch real counts concurrently
  const [
    totalModsRes,
    allowedModsRes,
    restrictedModsRes,
    blockedModsRes,
    pendingSuggestionsRes,
    auditLogsRes,
    recentSuggestionsRes,
    recentAuditLogsRes,
  ] = await Promise.all([
    supabase.from('mods').select('*', { count: 'exact', head: true }),
    supabase.from('mods').select('*', { count: 'exact', head: true }).eq('status', 'allowed'),
    supabase.from('mods').select('*', { count: 'exact', head: true }).eq('status', 'restricted'),
    supabase.from('mods').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
    supabase.from('mod_suggestions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
    supabase.from('mod_suggestions').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6),
  ]);

  const stats = {
    total: totalModsRes.count ?? 0,
    allowed: allowedModsRes.count ?? 0,
    restricted: restrictedModsRes.count ?? 0,
    blocked: blockedModsRes.count ?? 0,
    pendingSuggestions: pendingSuggestionsRes.count ?? 0,
    totalAudits: auditLogsRes.count ?? 0,
  };

  const recentSuggestions = (recentSuggestionsRes.data || []) as unknown as ModSuggestion[];
  const recentAuditLogs = (recentAuditLogsRes.data || []) as unknown as AuditLog[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Echtzeit-Übersicht der Survivalecke Mod-Datenbank
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/mods/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Neuen Mod eintragen</span>
          </Link>
        </div>
      </div>

      {/* Real Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#14161b] border border-[#232730] p-3.5 rounded-md">
          <div className="text-[11px] font-medium text-zinc-400">Gesamt Mods</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {stats.total}
          </div>
        </div>

        <div className="bg-[#14161b] border border-[#232730] p-3.5 rounded-md">
          <div className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Erlaubt</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">
            {stats.allowed}
          </div>
        </div>

        <div className="bg-[#14161b] border border-[#232730] p-3.5 rounded-md">
          <div className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Eingeschränkt</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">
            {stats.restricted}
          </div>
        </div>

        <div className="bg-[#14161b] border border-[#232730] p-3.5 rounded-md">
          <div className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Verboten</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">
            {stats.blocked}
          </div>
        </div>

        <div className="bg-[#14161b] border border-[#232730] p-3.5 rounded-md">
          <div className="text-[11px] font-medium text-amber-300 flex items-center gap-1">
            <Inbox className="w-3 h-3" />
            <span>Offene Vorschläge</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">
            {stats.pendingSuggestions}
          </div>
        </div>

        <div className="bg-[#14161b] border border-[#232730] p-3.5 rounded-md">
          <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
            <History className="w-3 h-3" />
            <span>Audit-Aktionen</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">
            {stats.totalAudits}
          </div>
        </div>
      </div>

      {/* Two-Column Section: Suggestions & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Suggestions */}
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#20242e] pb-3">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-200">
                Neueste Mod-Vorschläge
              </h2>
            </div>
            <Link
              href="/admin/suggestions"
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1"
            >
              <span>Alle anzeigen</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentSuggestions.length > 0 ? (
            <ul className="divide-y divide-[#1e222a] text-xs">
              {recentSuggestions.map((sug) => (
                <li key={sug.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-zinc-200">{sug.mod_name}</div>
                    <div className="text-[11px] text-zinc-400">
                      {sug.loader || 'Beliebiger Loader'} • MC {sug.minecraft_version || '–'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded uppercase font-mono ${
                        sug.status === 'pending'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                          : sug.status === 'accepted'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {sug.status}
                    </span>
                    <Link
                      href={`/admin/suggestions`}
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center text-xs text-zinc-400">
              Keine Vorschläge vorhanden (0 Vorschläge).
            </div>
          )}
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#20242e] pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-200">
                Letzte Audit-Aktivitäten
              </h2>
            </div>
            <Link
              href="/admin/audit"
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1"
            >
              <span>Vollständiges Log</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentAuditLogs.length > 0 ? (
            <ul className="divide-y divide-[#1e222a] text-xs">
              {recentAuditLogs.map((log) => (
                <li key={log.id} className="py-2.5 flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-mono text-[11px] text-zinc-300">
                      <span className="text-emerald-400">{log.action}</span>
                      {log.entity_name && (
                        <span className="text-zinc-400"> &rarr; {log.entity_name}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {log.user_email || 'System'}
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-400 shrink-0">
                    {formatDate(log.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center text-xs text-zinc-400">
              Keine Audit-Einträge vorhanden (0 Aktionen protokolliert).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
