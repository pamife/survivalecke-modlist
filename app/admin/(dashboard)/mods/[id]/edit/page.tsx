import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { AdminModForm } from '@/components/AdminModForm';
import { SyncModButton } from '@/components/SyncModButton';
import type { Mod, ModRestriction, ModVersion } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminEditModPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: modData, error } = await supabase
    .from('mods')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !modData) {
    notFound();
  }

  const mod = modData as unknown as Mod;

  // Fetch existing restrictions
  const { data: restrictionsData } = await supabase
    .from('mod_restrictions')
    .select('*')
    .eq('mod_id', mod.id)
    .order('created_at', { ascending: true });

  const restrictions = (restrictionsData || []) as unknown as ModRestriction[];

  // Fetch existing versions
  const { data: versionsData } = await supabase
    .from('mod_versions')
    .select('*')
    .eq('mod_id', mod.id)
    .order('created_at', { ascending: false });

  const versions = (versionsData || []) as unknown as ModVersion[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Mod bearbeiten: {mod.name}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            ID: {mod.id} • Slug: /{mod.slug}
            {mod.last_synced_at && (
              <span className="text-zinc-500 ml-2">
                • Letzte Synchronisierung: {new Date(mod.last_synced_at).toLocaleDateString('de-DE')}
              </span>
            )}
          </p>
        </div>

        {mod.source && mod.source !== 'manual' && (
          <SyncModButton
            modId={mod.id}
            source={mod.source}
            lastSyncedAt={mod.last_synced_at}
          />
        )}
      </div>

      <AdminModForm
        mod={mod}
        initialRestrictions={restrictions}
        initialVersions={versions}
      />
    </div>
  );
}
