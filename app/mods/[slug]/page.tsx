import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Cpu,
  ShieldAlert,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { MinecraftHeaderVersions, MinecraftVersionSection } from '@/components/MinecraftVersionDisplay';
import type { Mod, ModVersion, ModRestriction } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: modData } = await supabase
    .from('mods')
    .select('name, status, category, description')
    .eq('slug', slug)
    .single();

  const mod = modData as { name: string; status: string; category: string; description: string | null } | null;

  if (!mod) {
    return {
      title: 'Mod nicht gefunden',
    };
  }

  const statusTexts: Record<string, string> = {
    allowed: 'Erlaubt',
    restricted: 'Eingeschränkt',
    blocked: 'Verboten',
    unknown: 'Ungeprüft',
  };

  return {
    title: `${mod.name} – Mod-Status`,
    description: `Mod-Prüfungsstatus für ${mod.name} auf Survivalecke: ${statusTexts[mod.status] || 'Ungeprüft'}. Kategorie: ${mod.category}.`,
  };
}

export default async function ModDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: modData, error } = await supabase
    .from('mods')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !modData) {
    notFound();
  }

  const mod = modData as unknown as Mod;

  // Fetch structured restrictions
  const { data: restrictionsData } = await supabase
    .from('mod_restrictions')
    .select('*')
    .eq('mod_id', mod.id)
    .order('created_at', { ascending: true });

  const restrictions = (restrictionsData || []) as unknown as ModRestriction[];

  // Fetch version-specific overrides/details if any
  const { data: versionsData } = await supabase
    .from('mod_versions')
    .select('*')
    .eq('mod_id', mod.id)
    .order('created_at', { ascending: false });

  const versions = (versionsData || []) as unknown as ModVersion[];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
      {/* Breadcrumb / Back button */}
      <div>
        <Link
          href="/mods"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Zurück zur Mod-Übersicht</span>
        </Link>
      </div>

      {/* Main Header Panel */}
      <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {mod.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mod.icon_url}
                alt={mod.name}
                className="w-16 h-16 rounded-lg bg-zinc-800 object-cover border border-[#232730] shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-zinc-800 border border-[#232730] flex items-center justify-center text-zinc-500 font-bold text-2xl shrink-0">
                {mod.name.charAt(0) || 'M'}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {mod.category}
                </span>
                {mod.mod_id && (
                  <span className="text-xs font-mono text-zinc-400">
                    ID: {mod.mod_id}
                  </span>
                )}
                {mod.source && mod.source !== 'manual' && (
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 capitalize">
                    {mod.source}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {mod.name}
              </h1>
            </div>
          </div>

          <StatusBadge status={mod.status} size="lg" />
        </div>

        {mod.description && (
          <p className="text-xs sm:text-sm text-zinc-300 border-t border-[#1f232c] pt-4">
            {mod.description}
          </p>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#1f232c] text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
              <Cpu className="w-3.5 h-3.5" />
              <span>Loader</span>
            </div>
            <div className="font-medium text-zinc-200">
              {mod.loaders && mod.loaders.length > 0
                ? mod.loaders.join(', ')
                : '–'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
              <Layers className="w-3.5 h-3.5" />
              <span>Minecraft</span>
            </div>
            <MinecraftHeaderVersions versions={mod.minecraft_versions || []} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
              <Calendar className="w-3.5 h-3.5" />
              <span>Zuletzt geprüft</span>
            </div>
            <div className="font-medium text-zinc-200">
              {formatDate(mod.last_reviewed_at || mod.updated_at)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-zinc-400 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Geprüfte Versionen</span>
            </div>
            <div className="font-medium text-zinc-200">
              {versions.length > 0 ? `${versions.length} Versionen` : 'Alle Versionen'}
            </div>
          </div>
        </div>
      </div>

      {/* Status Reason / Begründung */}
      {mod.reason && (
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-2">
          <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-zinc-400" />
            <span>Warum diese Einstufung?</span>
          </h2>
          <div className="text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
            {mod.reason}
          </div>
        </div>
      )}

      {/* Unknown Status Warning Banner */}
      {mod.status === 'unknown' && (
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-5 flex items-start gap-3 text-xs text-zinc-300">
          <ShieldAlert className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-zinc-200">Noch nicht von Survivalecke geprüft</h3>
            <p className="text-zinc-400 leading-relaxed">
              Dieser Mod wurde von unserem Team noch nicht offiziell überprüft. Die Nutzung auf dem Server erfolgt auf eigenes Risiko. Unfaire Spielvorteile bleiben gemäß Serverregeln untersagt.
            </p>
          </div>
        </div>
      )}

      {/* Restrictions / Auflagen (Structured Display) */}
      {(restrictions.length > 0 || mod.restrictions) && (
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-md p-6 space-y-3">
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Auflagen & Einschränkungen für Survivalecke</span>
          </h2>

          {restrictions.length > 0 ? (
            <ul className="space-y-3 pt-1">
              {restrictions.map((r) => (
                <li key={r.id} className="space-y-0.5 border-b border-amber-900/30 last:border-0 pb-2.5 last:pb-0">
                  <div className="text-xs sm:text-sm font-semibold text-amber-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>{r.title}</span>
                  </div>
                  <p className="text-xs text-amber-200/90 pl-3 leading-relaxed">
                    {r.description}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs sm:text-sm text-amber-200 whitespace-pre-line leading-relaxed">
              {mod.restrictions}
            </div>
          )}
        </div>
      )}

      {/* Supported Minecraft Versions Section */}
      {mod.minecraft_versions && mod.minecraft_versions.length > 0 && (
        <MinecraftVersionSection versions={mod.minecraft_versions} />
      )}

      {/* Version Scope Notice when no specific version overrides exist */}
      {versions.length === 0 && (
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-4 text-xs text-zinc-400 flex items-center justify-between">
          <span className="text-zinc-300 font-medium">Geltungsbereich der Einstufung:</span>
          <span className="font-mono text-zinc-200">Gilt für alle unterstützten Versionen</span>
        </div>
      )}

      {/* Version Specific Overrides */}
      {versions.length > 0 && (
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-3">
          <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Geprüfte Mod-Versionen
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#232730] text-[11px] text-zinc-400 font-semibold">
                  <th className="py-2 px-3">Mod-Version</th>
                  <th className="py-2 px-3">Minecraft</th>
                  <th className="py-2 px-3">Loader</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Hinweis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222a]">
                {versions.map((ver) => (
                  <tr key={ver.id} className="hover:bg-[#181b22]">
                    <td className="py-2 px-3 font-mono font-medium text-zinc-200">
                      {ver.mod_version}
                    </td>
                    <td className="py-2 px-3 text-zinc-300">
                      {ver.minecraft_version}
                    </td>
                    <td className="py-2 px-3 text-zinc-300">{ver.loader}</td>
                    <td className="py-2 px-3">
                      <StatusBadge status={ver.status} size="sm" />
                    </td>
                    <td className="py-2 px-3 text-zinc-400">
                      {ver.note || '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
