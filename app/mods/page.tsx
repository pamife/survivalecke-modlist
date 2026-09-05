import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ModCatalog } from '@/components/ModCatalog';
import { processMinecraftVersions } from '@/lib/minecraft';
import { PlusCircle, AlertCircle } from 'lucide-react';
import type { ModWithRestrictions } from '@/types/database';

export const metadata: Metadata = {
  title: 'Mods – Survivalecke Mod-Datenbank',
  description:
    'Prüfe schnell und verbindlich, welche Client-Mods auf dem Minecraft-Server Survivalecke erlaubt, eingeschränkt oder verboten sind.',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    loader?: string;
    version?: string;
    category?: string;
    sort?: string;
  }>;
}

export default async function ModsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q?.trim() || '';
  const status = resolvedParams.status?.trim() || '';
  const loader = resolvedParams.loader?.trim() || '';
  const version = resolvedParams.version?.trim() || '';
  const category = resolvedParams.category?.trim() || '';
  const sort = resolvedParams.sort?.trim() || 'name_asc';

  const supabase = await createClient();

  // Single fast query for all mods with their restrictions
  const { data: allModsData, error } = await supabase
    .from('mods')
    .select('*, mod_restrictions(id, title, description)')
    .order('name', { ascending: true });

  if (error || !allModsData) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 w-full">
        <div className="border border-rose-800/60 rounded-lg p-8 text-center bg-[#14161b] space-y-4">
          <div className="w-10 h-10 rounded-full bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">
              Die Mod-Liste konnte momentan nicht geladen werden.
            </h2>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Die Verbindung zur Datenbank konnte nicht hergestellt werden. Bitte versuche es in wenigen Augenblicken erneut.
            </p>
          </div>
          <Link
            href="/mods"
            className="inline-flex items-center gap-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded transition-colors"
          >
            Erneut versuchen
          </Link>
        </div>
      </div>
    );
  }

  const allMods = allModsData as unknown as ModWithRestrictions[];

  // Calculate status counts
  const statusCounts = {
    total: allMods.length,
    allowed: allMods.filter((m) => m.status === 'allowed').length,
    restricted: allMods.filter((m) => m.status === 'restricted').length,
    blocked: allMods.filter((m) => m.status === 'blocked').length,
    unknown: allMods.filter((m) => m.status === 'unknown').length,
  };

  // Collect available filter options
  const categories = Array.from(
    new Set(allMods.map((m) => m.category).filter(Boolean))
  ).sort();

  const loaders = Array.from(
    new Set(allMods.flatMap((m) => m.loaders || []).filter(Boolean))
  ).sort();

  const rawMcVersions = Array.from(
    new Set(allMods.flatMap((m) => m.minecraft_versions || []).filter(Boolean))
  );
  const { releases: mcVersions } = processMinecraftVersions(rawMcVersions);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full space-y-6">
      {/* Compact, purposeful Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232730] pb-5">
        <div className="space-y-1">
          <span className="text-[11px] font-mono tracking-wider uppercase text-emerald-400 font-semibold">
            Survivalecke
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Mods
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
            Finde in Sekunden heraus, welche Client-Mods auf Survivalecke erlaubt, eingeschränkt oder verboten sind.
          </p>
        </div>

        <Link
          href="/suggest"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#14161b] hover:bg-[#1a1e26] border border-[#262b35] hover:border-zinc-500 text-zinc-200 hover:text-white text-xs font-semibold rounded-md transition-colors self-start sm:self-auto cursor-pointer shrink-0"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Mod vorschlagen</span>
        </Link>
      </div>

      {/* Main Catalog View with Instant Search and Background URL Sync */}
      <ModCatalog
        mods={allMods}
        categories={categories}
        loaders={loaders}
        mcVersions={mcVersions}
        statusCounts={statusCounts}
        initialQuery={q}
        initialStatus={status}
        initialLoader={loader}
        initialVersion={version}
        initialCategory={category}
        initialSort={sort}
      />
    </div>
  );
}
