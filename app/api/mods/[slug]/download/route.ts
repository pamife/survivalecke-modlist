import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModrinthProjectVersions } from '@/lib/modrinth';
import type { Mod, ModVersion } from '@/types/database';

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const requestedLoader = searchParams.get('loader')?.toLowerCase();
  const requestedMc = searchParams.get('mc');
  const requestedVersion = searchParams.get('version');

  const supabase = await createClient();

  const { data: modData, error } = await supabase
    .from('mods')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !modData) {
    return NextResponse.json({ error: 'Mod nicht gefunden.' }, { status: 404 });
  }

  const mod = modData as unknown as Mod;

  if (mod.status === 'blocked') {
    return NextResponse.json(
      {
        error: 'Download gesperrt: Dieser Mod ist auf Survivalecke verboten und darf auf dem Server nicht verwendet werden.',
      },
      { status: 403 }
    );
  }

  // 1. Try fetching versions from DB
  const { data: versionsData } = await supabase
    .from('mod_versions')
    .select('*')
    .eq('mod_id', mod.id)
    .order('created_at', { ascending: false });

  let versions = (versionsData || []) as unknown as ModVersion[];

  // 2. Fallback to live Modrinth if DB has no versions
  if (versions.length === 0 && (mod.modrinth_id || mod.source_project_id)) {
    const projectId = mod.modrinth_id || mod.source_project_id!;
    const { versions: mrVersions } = await getModrinthProjectVersions(projectId, 20);
    if (mrVersions && mrVersions.length > 0) {
      versions = mrVersions.map((v) => ({
        id: v.id,
        mod_id: mod.id,
        mod_version: v.version_number,
        minecraft_version: v.game_versions?.[0] || '1.21.1',
        loader: (v.loaders?.[0] || 'Fabric').charAt(0).toUpperCase() + (v.loaders?.[0] || 'Fabric').slice(1),
        status: mod.status,
        note: null,
        source_version_id: v.id,
        published_at: v.date_published,
        release_type: v.version_type,
        changelog: v.changelog,
        files_metadata: v.files as any,
        created_at: v.date_published,
      }));
    }
  }

  if (versions.length === 0) {
    // If no direct versions, redirect to source url if available
    if (mod.source_url || mod.modrinth_url || mod.website_url) {
      return NextResponse.redirect(mod.source_url || mod.modrinth_url || mod.website_url!);
    }
    return NextResponse.json({ error: 'Keine Download-Dateien verfügbar.' }, { status: 404 });
  }

  // Filter versions by request criteria if provided
  let candidates = versions;
  if (requestedVersion) {
    candidates = candidates.filter((v) => v.mod_version === requestedVersion);
  }
  if (requestedLoader) {
    candidates = candidates.filter((v) => v.loader.toLowerCase() === requestedLoader);
  }
  if (requestedMc) {
    candidates = candidates.filter((v) => v.minecraft_version === requestedMc);
  }

  const targetVersion = candidates.length > 0 ? candidates[0] : versions[0];
  const files = (Array.isArray(targetVersion.files_metadata) ? targetVersion.files_metadata : []) as any[];

  const primaryFile = files.find((f) => f.primary) || files.find((f) => f.filename?.endsWith('.jar')) || files[0];

  if (!primaryFile || !primaryFile.url) {
    return NextResponse.json({ error: 'Keine gültige Download-URL für diese Version gefunden.' }, { status: 404 });
  }

  return NextResponse.redirect(primaryFile.url, 302);
}
