'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { processMinecraftVersions } from '@/lib/minecraft';
import type { ModSource } from '@/types/database';

export interface ExternalModVersion {
  id: string;
  version_number: string;
  name: string;
  game_versions: string[];
  loaders: string[];
  date_published: string;
}

export interface ImportedModData {
  source: ModSource;
  source_project_id: string;
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
  versions: ExternalModVersion[];
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
  return 'Other';
}

// SSRF Safe URL Validator
function validateAndParseExternalUrl(rawUrl: string): {
  platform: 'modrinth' | 'curseforge' | 'unknown';
  identifier: string;
} | null {
  try {
    const parsed = new URL(rawUrl.trim());

    // Only HTTPS
    if (parsed.protocol !== 'https:') {
      return null;
    }

    // Disallow custom ports
    if (parsed.port && parsed.port !== '443') {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check Modrinth
    if (hostname === 'modrinth.com' || hostname === 'www.modrinth.com') {
      // Examples: /mod/sodium, /mod/sodium/versions, /mod/AANobbMI
      const match = parsed.pathname.match(/^\/mod\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        return { platform: 'modrinth', identifier: match[1] };
      }
    }

    // Check CurseForge
    if (hostname === 'curseforge.com' || hostname === 'www.curseforge.com') {
      // Example: /minecraft/mc-mods/sodium
      const match = parsed.pathname.match(/^\/minecraft\/mc-mods\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        return { platform: 'curseforge', identifier: match[1] };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function fetchExternalMod(rawInput: string): Promise<ImportResult> {
  await requireAdmin();

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { success: false, error: 'Bitte gib einen Modrinth- oder CurseForge-Link ein.' };
  }

  const parsedUrl = validateAndParseExternalUrl(trimmed);
  let platform: 'modrinth' | 'curseforge' = 'modrinth';
  let identifier = trimmed;

  if (parsedUrl) {
    platform = parsedUrl.platform as 'modrinth' | 'curseforge';
    identifier = parsedUrl.identifier;
  } else {
    // If it's not a full URL, check if it looks like a direct slug / ID for fallback
    if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      platform = 'modrinth'; // default manual fallback
      identifier = trimmed;
    } else {
      return {
        success: false,
        error:
          'Der Link konnte nicht als unterstützter Mod erkannt werden. Bitte nutze einen Link von modrinth.com oder curseforge.com.',
      };
    }
  }

  // Handle CurseForge
  if (platform === 'curseforge') {
    const cfApiKey = process.env.CURSEFORGE_API_KEY;
    if (!cfApiKey) {
      return {
        success: false,
        error:
          'CurseForge kann derzeit nicht automatisch geladen werden. Die CurseForge-Integration ist nicht konfiguriert.',
      };
    }

    try {
      const cfRes = await fetch(
        `https://api.curseforge.com/v1/mods/search?gameId=432&slug=${encodeURIComponent(identifier)}`,
        {
          headers: {
            'x-api-key': cfApiKey,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!cfRes.ok) {
        return {
          success: false,
          error: 'CurseForge API konnte nicht erreicht werden. Bitte versuche es später erneut.',
        };
      }

      const cfJson = await cfRes.json();
      const mod = cfJson.data?.[0];
      if (!mod) {
        return {
          success: false,
          error: 'Dieser Mod wurde auf CurseForge nicht gefunden.',
        };
      }

      // Check for duplicate in DB
      const supabase = await createClient();
      const { data: existing } = await supabase
        .from('mods')
        .select('id, name, slug')
        .or(`curseforge_id.eq.${mod.id},slug.eq.${mod.slug}`)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          duplicate: true,
          existingMod: existing,
          error: 'Dieser Mod befindet sich bereits in der Datenbank.',
        };
      }

      const loaders = Array.from(
        new Set(
          (mod.latestFilesIndexes || [])
            .map((f: { modLoader?: number }) => {
              if (f.modLoader === 4) return 'Fabric';
              if (f.modLoader === 1) return 'Forge';
              if (f.modLoader === 5) return 'Quilt';
              if (f.modLoader === 6) return 'NeoForge';
              return null;
            })
            .filter(Boolean)
        )
      ) as string[];

      const mcVersions = Array.from(
        new Set(
          (mod.latestFilesIndexes || [])
            .map((f: { gameVersion?: string }) => f.gameVersion)
            .filter((v: string) => v && /^[0-9]+\.[0-9]+(\.[0-9]+)?$/.test(v))
        )
      ).sort().reverse() as string[];

      return {
        success: true,
        data: {
          source: 'curseforge',
          source_project_id: String(mod.id),
          name: mod.name,
          slug: mod.slug,
          mod_id: mod.slug,
          description: mod.summary || '',
          icon_url: mod.logo?.thumbnailUrl || null,
          category: mapToStandardCategory(mod.categories?.map((c: { name: string }) => c.name) || []),
          loaders: loaders.length > 0 ? loaders : ['Fabric'],
          minecraft_versions: mcVersions,
          website_url: mod.links?.websiteUrl || null,
          source_url: mod.links?.sourceUrl || null,
          modrinth_url: null,
          curseforge_url: `https://www.curseforge.com/minecraft/mc-mods/${mod.slug}`,
          versions: (mod.latestFiles || []).map((f: { id: number; displayName: string; fileName: string; fileDate: string; gameVersions: string[] }) => ({
            id: String(f.id),
            version_number: f.displayName || f.fileName,
            name: f.displayName || f.fileName,
            game_versions: f.gameVersions?.filter((v) => /^[0-9]+\.[0-9]+/.test(v)) || [],
            loaders: loaders,
            date_published: f.fileDate,
          })),
        },
      };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error && err.name === 'TimeoutError'
            ? 'Zeitüberschreitung bei der Anfrage an CurseForge.'
            : 'CurseForge konnte nicht erreicht werden. Bitte versuche es später erneut.',
      };
    }
  }

  // Handle Modrinth
  try {
    const projectRes = await fetch(
      `https://api.modrinth.com/v2/project/${encodeURIComponent(identifier)}`,
      {
        headers: {
          'User-Agent': 'Survivalecke-Modlist/1.0 (admin@survivalecke.de)',
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (projectRes.status === 404) {
      return {
        success: false,
        error: 'Dieser Mod wurde auf Modrinth nicht gefunden.',
      };
    }

    if (!projectRes.ok) {
      return {
        success: false,
        error: 'Modrinth konnte nicht erreicht werden. Bitte versuche es später erneut.',
      };
    }

    const project = await projectRes.json();

    // Check for duplicate in Supabase
    const supabase = await createClient();
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
        error: 'Dieser Mod befindet sich bereits in der Datenbank.',
      };
    }

    // Fetch versions list
    let versionsList: ExternalModVersion[] = [];
    try {
      const versionsRes = await fetch(
        `https://api.modrinth.com/v2/project/${encodeURIComponent(project.id)}/version`,
        {
          headers: {
            'User-Agent': 'Survivalecke-Modlist/1.0 (admin@survivalecke.de)',
          },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (versionsRes.ok) {
        const rawVersions = await versionsRes.json();
        if (Array.isArray(rawVersions)) {
          versionsList = rawVersions.slice(0, 30).map((v) => ({
            id: v.id,
            version_number: v.version_number,
            name: v.name || v.version_number,
            game_versions: v.game_versions || [],
            loaders: (v.loaders || []).map(
              (l: string) => l.charAt(0).toUpperCase() + l.slice(1)
            ),
            date_published: v.date_published,
          }));
        }
      }
    } catch {
      // Versions are optional enhancement; do not fail overall import
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
        versions: versionsList,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error && err.name === 'TimeoutError'
          ? 'Zeitüberschreitung bei der Anfrage an Modrinth.'
          : 'Modrinth konnte nicht erreicht werden. Bitte versuche es später erneut.',
    };
  }
}
