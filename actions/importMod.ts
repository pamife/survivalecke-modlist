'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { processMinecraftVersions } from '@/lib/minecraft';
import type { ModSource } from '@/types/database';
import {
  extractModrinthIdentifier,
  getModrinthProject,
  getModrinthProjectVersions,
  searchModrinthProjects,
  type ModrinthSearchHit,
  type ModrinthVersion,
} from '@/lib/modrinth';

export interface ExternalModFile {
  filename: string;
  size: number;
  hashes: {
    sha1?: string;
    sha512?: string;
  };
  url: string;
}

export interface ExternalModVersion {
  id: string;
  version_number: string;
  name: string;
  game_versions: string[];
  loaders: string[];
  version_type: 'release' | 'beta' | 'alpha';
  date_published: string;
  changelog: string | null;
  files: ExternalModFile[];
}

export interface ImportedModData {
  source: ModSource;
  source_project_id: string;
  modrinth_id: string | null;
  curseforge_id: string | null;
  name: string;
  slug: string;
  mod_id: string;
  description: string;
  icon_url: string | null;
  category: string;
  loaders: string[];
  minecraft_versions: string[];
  website_url: string | null;
  source_url: string | null;
  modrinth_url: string | null;
  curseforge_url: string | null;
  modrinth_metadata: Record<string, unknown> | null;
  versions: ExternalModVersion[];
}

export interface SearchResultItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string | null;
  author: string;
  source: ModSource | 'local';
  loaders: string[];
  game_versions: string[];
  downloads?: number;
  isExisting?: boolean;
  existingId?: string;
}

export interface SearchExternalResult {
  success: boolean;
  error?: string;
  isDirectUrl?: boolean;
  results: SearchResultItem[];
}

export interface ImportResult {
  success: boolean;
  error?: string;
  duplicate?: boolean;
  existingMod?: {
    id: string;
    name: string;
    slug: string;
  };
  data?: ImportedModData;
}

// Category mapping helper
function mapToStandardCategory(categories: string[]): string {
  const mapping: Record<string, string> = {
    optimization: 'Performance',
    performance: 'Performance',
    shaders: 'Visual',
    graphics: 'Visual',
    visual: 'Visual',
    hud: 'HUD',
    interface: 'HUD',
    gui: 'HUD',
    accessibility: 'Accessibility',
    cosmetic: 'Cosmetic',
    map: 'Map',
    minimap: 'Map',
    replay: 'Replay',
    utility: 'Utility',
    inventory: 'Utility',
    automation: 'Automation',
    combat: 'Combat',
    movement: 'Movement',
    worldgen: 'World',
    world: 'World',
  };

  for (const cat of categories) {
    const lower = cat.toLowerCase();
    if (mapping[lower]) {
      return mapping[lower];
    }
  }
  return 'Allgemein';
}

/**
 * Multi-stage search across:
 * 1. Local Survivalecke Database (flags duplicates)
 * 2. Modrinth API (primary source)
 * 3. CurseForge (if configured / recognized URL)
 */
export async function searchExternalMods(rawQuery: string): Promise<SearchExternalResult> {
  await requireAdmin();

  const query = rawQuery.trim();
  if (!query) {
    return { success: false, error: 'Bitte einen Suchbegriff oder eine URL eingeben.', results: [] };
  }

  const supabase = await createClient();

  // 1. Check if input is a direct Modrinth URL
  const directModrinthId = extractModrinthIdentifier(query);
  if (directModrinthId && (query.includes('modrinth.com') || query.includes('/mod/'))) {
    const { project, error } = await getModrinthProject(directModrinthId);
    if (project) {
      // Check if already in DB
      const { data: existing } = await supabase
        .from('mods')
        .select('id, name, slug')
        .or(`modrinth_id.eq.${project.id},source_project_id.eq.${project.id},slug.eq.${project.slug}`)
        .maybeSingle();

      return {
        success: true,
        isDirectUrl: true,
        results: [
          {
            id: project.id,
            slug: project.slug,
            title: project.title,
            description: project.description || '',
            icon_url: project.icon_url,
            author: project.team || 'Modrinth',
            source: 'modrinth',
            loaders: (project.loaders || []).map((l: string) => l.charAt(0).toUpperCase() + l.slice(1)),
            game_versions: project.game_versions || [],
            isExisting: Boolean(existing),
            existingId: existing?.id,
          },
        ],
      };
    }
    if (error) {
      return { success: false, error, results: [] };
    }
  }

  // 2. Stage 1: Search local DB first
  const { data: localMatches } = await supabase
    .from('mods')
    .select('id, name, slug, description, icon_url, loaders, minecraft_versions, source')
    .or(`name.ilike.%${query}%,slug.ilike.%${query}%`)
    .limit(4);

  const existingIds = new Set<string>();
  const localResults: SearchResultItem[] = (localMatches || []).map((m) => {
    existingIds.add(m.slug.toLowerCase());
    return {
      id: m.id,
      slug: m.slug,
      title: m.name,
      description: m.description || '',
      icon_url: m.icon_url,
      author: 'Survivalecke DB',
      source: 'local',
      loaders: m.loaders || [],
      game_versions: m.minecraft_versions || [],
      isExisting: true,
      existingId: m.id,
    };
  });

  // 3. Stage 2: Search Modrinth API
  const { hits: modrinthHits, error: searchError } = await searchModrinthProjects(query, 8);

  const modrinthResults: SearchResultItem[] = [];

  for (const hit of modrinthHits) {
    const isAlreadyLocal = existingIds.has(hit.slug.toLowerCase());
    modrinthResults.push({
      id: hit.project_id,
      slug: hit.slug,
      title: hit.title,
      description: hit.description,
      icon_url: hit.icon_url,
      author: hit.author,
      source: 'modrinth',
      loaders: hit.loaders,
      game_versions: hit.game_versions,
      downloads: hit.downloads,
      isExisting: isAlreadyLocal,
    });
  }

  const combined = [...localResults, ...modrinthResults];

  if (combined.length === 0 && searchError) {
    return { success: false, error: searchError, results: [] };
  }

  return {
    success: true,
    isDirectUrl: false,
    results: combined,
  };
}

/**
 * Fetches full project details and version list from Modrinth or supported external platform.
 * NEVER sets status to allowed.
 */
export async function fetchExternalMod(rawInput: string): Promise<ImportResult> {
  await requireAdmin();

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { success: false, error: 'Bitte gib einen Modrinth-Link oder Mod-Namen ein.' };
  }

  const identifier = extractModrinthIdentifier(trimmed) || trimmed;
  const supabase = await createClient();

  // 1. Fetch Modrinth Project
  const { project, error: projectError } = await getModrinthProject(identifier);
  if (!project) {
    return {
      success: false,
      error: projectError || `Mod "${identifier}" wurde auf Modrinth nicht gefunden.`,
    };
  }

  // 2. Duplicate Detection in Supabase
  const { data: existing } = await supabase
    .from('mods')
    .select('id, name, slug')
    .or(`modrinth_id.eq.${project.id},source_project_id.eq.${project.id},slug.eq.${project.slug}`)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      duplicate: true,
      existingMod: existing,
      error: `Der Mod "${project.title}" befindet sich bereits in der Datenbank.`,
    };
  }

  // 3. Fetch Versions with full metadata & changelogs
  let versionsList: ExternalModVersion[] = [];
  const { versions: rawVersions } = await getModrinthProjectVersions(project.id, 35);

  if (rawVersions && rawVersions.length > 0) {
    versionsList = rawVersions.map((v: ModrinthVersion) => ({
      id: v.id,
      version_number: v.version_number,
      name: v.name || v.version_number,
      game_versions: v.game_versions || [],
      loaders: v.loaders || [],
      version_type: v.version_type || 'release',
      date_published: v.date_published,
      changelog: v.changelog || null,
      files: (v.files || []).map((f) => ({
        filename: f.filename,
        size: f.size,
        hashes: f.hashes || {},
        url: f.url,
      })),
    }));
  }

  const loaders = Array.from(
    new Set(
      (project.loaders || []).map(
        (l: string) => l.charAt(0).toUpperCase() + l.slice(1)
      )
    )
  ) as string[];

  const categories = [
    ...(project.categories || []),
    ...(project.additional_categories || []),
  ];

  return {
    success: true,
    data: {
      source: 'modrinth',
      source_project_id: project.id,
      modrinth_id: project.id,
      curseforge_id: null,
      name: project.title,
      slug: project.slug,
      mod_id: project.slug,
      description: project.description || '',
      icon_url: project.icon_url || null,
      category: mapToStandardCategory(categories),
      loaders: loaders.length > 0 ? loaders : ['Fabric'],
      minecraft_versions: processMinecraftVersions(project.game_versions || []).primary,
      website_url: project.issues_url || project.wiki_url || null,
      source_url: project.source_url || null,
      modrinth_url: `https://modrinth.com/mod/${project.slug}`,
      curseforge_url: null,
      modrinth_metadata: {
        team: project.team,
        license: project.license?.name || null,
        client_side: project.client_side,
        server_side: project.server_side,
        updated: project.updated,
      },
      versions: versionsList,
    },
  };
}
