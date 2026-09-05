import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { ModFilterBar } from '@/components/ModFilterBar';
import { PlusCircle, Search, ArrowRight } from 'lucide-react';
import type { Mod, ModStatus } from '@/types/database';

export const metadata: Metadata = {
  title: 'Mod-Datenbank',
  description:
    'Vollständige Übersicht aller geprüften Minecraft Client-Mods auf dem Server Survivalecke.',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    loader?: string;
    version?: string;
    category?: string;
  }>;
}

export default async function ModsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q?.trim() || '';
  const status = resolvedParams.status?.trim() || '';
  const loader = resolvedParams.loader?.trim() || '';
  const version = resolvedParams.version?.trim() || '';
  const category = resolvedParams.category?.trim() || '';

  const supabase = await createClient();

  // Fetch unique categories, loaders, and versions for filter dropdowns
  const { data: allModsMetaData } = await supabase
    .from('mods')
    .select('category, loaders, minecraft_versions');

  const allModsMeta = (allModsMetaData || []) as Array<{
    category: string;
    loaders: string[];
    minecraft_versions: string[];
  }>;

  const categories = Array.from(
    new Set(allModsMeta.map((m) => m.category).filter(Boolean))
  ).sort();

  const loaders = Array.from(
    new Set(allModsMeta.flatMap((m) => m.loaders || []).filter(Boolean))
  ).sort();

  const mcVersions = Array.from(
    new Set(allModsMeta.flatMap((m) => m.minecraft_versions || []).filter(Boolean))
  ).sort().reverse();

  // Build query
  let queryBuilder = supabase
    .from('mods')
    .select('*')
    .order('name', { ascending: true });

  if (q) {
    queryBuilder = queryBuilder.or(`name.ilike.%${q}%,mod_id.ilike.%${q}%,slug.ilike.%${q}%`);
  }

  if (status && ['allowed', 'restricted', 'blocked', 'unknown'].includes(status)) {
    queryBuilder = queryBuilder.eq('status', status as ModStatus);
  }

  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  if (loader) {
    queryBuilder = queryBuilder.contains('loaders', [loader]);
  }

  if (version) {
    queryBuilder = queryBuilder.contains('minecraft_versions', [version]);
  }

  const { data: mods } = await queryBuilder;
  const modList = (mods || []) as unknown as Mod[];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232730] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Client-Mod Datenbank
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Geprüfte Modifikationen für den Server Survivalecke ({modList.length} Einträge)
          </p>
        </div>

        <Link
          href="/suggest"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-xs font-medium rounded transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Mod vorschlagen</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <ModFilterBar
        categories={categories}
        loaders={loaders}
        mcVersions={mcVersions}
      />

      {/* Results Table (Desktop) / Cards (Mobile) */}
      {modList.length > 0 ? (
        <div className="border border-[#232730] rounded-md overflow-hidden bg-[#14161b]">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#232730] bg-[#101216] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Mod</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Loader</th>
                  <th className="py-3 px-4">Minecraft</th>
                  <th className="py-3 px-4">Kategorie</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222a] text-xs">
                {modList.map((mod) => (
                  <tr
                    key={mod.id}
                    className="hover:bg-[#181b22] transition-colors group"
                  >
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/mods/${mod.slug}`}
                        className="font-medium text-zinc-100 group-hover:text-white flex items-center gap-3"
                      >
                        {mod.icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mod.icon_url}
                            alt=""
                            className="w-8 h-8 rounded bg-zinc-800 object-cover border border-[#232730] shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-zinc-800 border border-[#232730] flex items-center justify-center text-zinc-500 font-bold text-xs shrink-0">
                            {mod.name.charAt(0) || 'M'}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold">{mod.name}</span>
                          {mod.mod_id && (
                            <span className="text-[11px] text-zinc-400 font-mono">
                              {mod.mod_id}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={mod.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">
                      {mod.loaders && mod.loaders.length > 0
                        ? mod.loaders.join(', ')
                        : '–'}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">
                      {mod.minecraft_versions && mod.minecraft_versions.length > 0
                        ? mod.minecraft_versions.slice(0, 3).join(', ') +
                          (mod.minecraft_versions.length > 3
                            ? ` (+${mod.minecraft_versions.length - 3})`
                            : '')
                        : '–'}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400">
                      <span className="px-2 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/60 text-[11px]">
                        {mod.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/mods/${mod.slug}`}
                        className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                        aria-label={`Details zu ${mod.name}`}
                      >
                        <span>Prüfung</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden divide-y divide-[#1e222a]">
            {modList.map((mod) => (
              <Link
                key={mod.id}
                href={`/mods/${mod.slug}`}
                className="p-4 flex flex-col gap-2 hover:bg-[#181b22] transition-colors block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {mod.name}
                    </h3>
                    {mod.mod_id && (
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {mod.mod_id}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={mod.status} size="sm" />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 pt-1">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px]">
                    {mod.category}
                  </span>
                  {mod.loaders && mod.loaders.length > 0 && (
                    <span>Loader: {mod.loaders.join(', ')}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        /* Empty State - Exact requirement #2: "Keine Mods gefunden." */
        <div className="border border-[#232730] rounded-md p-12 text-center bg-[#14161b] space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-200">
              Keine Mods gefunden.
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {q || status || loader || version || category
                ? 'Für die gewählten Such- und Filterkriterien liegen keine Einträge vor.'
                : 'In der Datenbank sind derzeit noch keine Mods eingetragen.'}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={q ? `/suggest?name=${encodeURIComponent(q)}` : '/suggest'}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 text-xs font-medium rounded transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Mod zur Prüfung vorschlagen</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
