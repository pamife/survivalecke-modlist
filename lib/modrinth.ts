/**
 * Dedicated, secure Modrinth API client for Survivalecke Modlist.
 *
 * Core Principle: "Modrinth informiert. Survivalecke entscheidet."
 * Modrinth provides metadata and version info only.
 */

const MODRINTH_API_BASE = 'https://api.modrinth.com/v2';
const USER_AGENT = 'Survivalecke-Modlist/1.0 (admin@survivalecke.de)';
const API_TIMEOUT_MS = 9000;

export interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string | null;
  author: string;
  categories: string[];
  loaders: string[];
  game_versions: string[];
  follows: number;
  downloads: number;
}

export interface ModrinthFile {
  filename: string;
  size: number;
  hashes: {
    sha1?: string;
    sha512?: string;
  };
  url: string;
  primary: boolean;
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  name: string;
  version_number: string;
  changelog: string | null;
  game_versions: string[];
  loaders: string[];
  version_type: 'release' | 'beta' | 'alpha';
  date_published: string;
  downloads: number;
  files: ModrinthFile[];
}

export interface ModrinthProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string | null;
  icon_url: string | null;
  client_side: 'required' | 'optional' | 'unsupported';
  server_side: 'required' | 'optional' | 'unsupported';
  game_versions: string[];
  loaders: string[];
  categories: string[];
  additional_categories?: string[];
  issues_url: string | null;
  source_url: string | null;
  wiki_url: string | null;
  discord_url: string | null;
  license?: {
    id: string;
    name: string;
    url?: string;
  };
  team: string;
  published: string;
  updated: string;
}

/**
 * SSRF Safe URL Parser for Modrinth links.
 * Accepts:
 * - https://modrinth.com/mod/{slug_or_id}
 * - https://www.modrinth.com/mod/{slug_or_id}
 * - Direct slug or project ID string (e.g. "sodium" or "AANobbMI")
 */
export function extractModrinthIdentifier(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Direct slug / ID (alphanumeric, underscores, hyphens)
  if (/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed) && !trimmed.includes('.')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    // Strictly enforce HTTPS and port 443
    if (parsed.protocol !== 'https:') return null;
    if (parsed.port && parsed.port !== '443') return null;

    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'modrinth.com' && hostname !== 'www.modrinth.com') {
      return null;
    }

    // Match /mod/{slug} or /project/{slug}
    const match = parsed.pathname.match(/^\/(?:mod|project)\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return match[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Executes an HTTP fetch against the Modrinth v2 API with standard headers and timeout.
 */
async function modrinthFetch<T>(path: string): Promise<{ data: T | null; error?: string; status: number }> {
  try {
    const url = `${MODRINTH_API_BASE}${path}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      next: { revalidate: 120 }, // Next.js server-side caching (2 mins)
    });

    if (res.status === 404) {
      return { data: null, error: 'Projekt oder Version wurde auf Modrinth nicht gefunden.', status: 404 };
    }

    if (res.status === 429) {
      return {
        data: null,
        error: 'Modrinth-API-Anfragelimit (Rate Limit) erreicht. Bitte warte einen kurzen Moment.',
        status: 429,
      };
    }

    if (!res.ok) {
      return {
        data: null,
        error: `Modrinth-API antwortete mit Status ${res.status}.`,
        status: res.status,
      };
    }

    const data = (await res.json()) as T;
    return { data, status: res.status };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return {
        data: null,
        error: 'Zeitüberschreitung bei der Verbindung zu Modrinth.',
        status: 408,
      };
    }
    return {
      data: null,
      error: 'Modrinth konnte nicht erreicht werden. Bitte prüfe deine Internetverbindung.',
      status: 503,
    };
  }
}

/**
 * Searches Modrinth mods by query term using the search endpoint.
 */
export async function searchModrinthProjects(
  query: string,
  limit: number = 8
): Promise<{ hits: ModrinthSearchHit[]; error?: string }> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { hits: [] };
  }

  const facets = encodeURIComponent(JSON.stringify([['project_type:mod']]));
  const path = `/search?query=${encodeURIComponent(cleanQuery)}&facets=${facets}&limit=${limit}`;

  const res = await modrinthFetch<{ hits: any[] }>(path);

  if (!res.data || !Array.isArray(res.data.hits)) {
    return { hits: [], error: res.error };
  }

  const hits: ModrinthSearchHit[] = res.data.hits.map((h) => ({
    project_id: h.project_id || h.slug,
    slug: h.slug,
    title: h.title,
    description: h.description || '',
    icon_url: h.icon_url || null,
    author: h.author || 'Unbekannt',
    categories: Array.isArray(h.categories) ? h.categories : [],
    loaders: (Array.isArray(h.loaders) ? h.loaders : []).map(
      (l: string) => l.charAt(0).toUpperCase() + l.slice(1)
    ),
    game_versions: Array.isArray(h.versions) ? h.versions : [],
    follows: h.follows || 0,
    downloads: h.downloads || 0,
  }));

  return { hits };
}

/**
 * Fetches full project details from Modrinth by ID or slug.
 */
export async function getModrinthProject(
  identifier: string
): Promise<{ project: ModrinthProject | null; error?: string }> {
  const cleanId = identifier.trim();
  if (!cleanId) {
    return { project: null, error: 'Kein Identifier übergeben.' };
  }

  const res = await modrinthFetch<ModrinthProject>(`/project/${encodeURIComponent(cleanId)}`);

  if (!res.data) {
    return { project: null, error: res.error || 'Projekt nicht gefunden.' };
  }

  return { project: res.data };
}

/**
 * Fetches all published versions for a Modrinth project.
 */
export async function getModrinthProjectVersions(
  projectId: string,
  limit: number = 30
): Promise<{ versions: ModrinthVersion[]; error?: string }> {
  const cleanId = projectId.trim();
  if (!cleanId) {
    return { versions: [] };
  }

  const res = await modrinthFetch<any[]>(`/project/${encodeURIComponent(cleanId)}/version`);

  if (!res.data || !Array.isArray(res.data)) {
    return { versions: [], error: res.error };
  }

  const versions: ModrinthVersion[] = res.data.slice(0, limit).map((v) => ({
    id: v.id,
    project_id: v.project_id,
    name: v.name || v.version_number,
    version_number: v.version_number,
    changelog: v.changelog || null,
    game_versions: Array.isArray(v.game_versions) ? v.game_versions : [],
    loaders: (Array.isArray(v.loaders) ? v.loaders : []).map(
      (l: string) => l.charAt(0).toUpperCase() + l.slice(1)
    ),
    version_type: (v.version_type as 'release' | 'beta' | 'alpha') || 'release',
    date_published: v.date_published,
    downloads: v.downloads || 0,
    files: (Array.isArray(v.files) ? v.files : []).map((f: any) => ({
      filename: f.filename,
      size: f.size,
      hashes: f.hashes || {},
      url: f.url,
      primary: Boolean(f.primary),
    })),
  }));

  return { versions };
}

/**
 * Fetches a single Modrinth version with changelog and files.
 */
export async function getModrinthVersionDetails(
  versionId: string
): Promise<{ version: ModrinthVersion | null; error?: string }> {
  const cleanId = versionId.trim();
  if (!cleanId) {
    return { version: null, error: 'Keine Versions-ID übergeben.' };
  }

  const res = await modrinthFetch<any>(`/version/${encodeURIComponent(cleanId)}`);

  if (!res.data) {
    return { version: null, error: res.error || 'Version nicht gefunden.' };
  }

  const v = res.data;
  const version: ModrinthVersion = {
    id: v.id,
    project_id: v.project_id,
    name: v.name || v.version_number,
    version_number: v.version_number,
    changelog: v.changelog || null,
    game_versions: Array.isArray(v.game_versions) ? v.game_versions : [],
    loaders: (Array.isArray(v.loaders) ? v.loaders : []).map(
      (l: string) => l.charAt(0).toUpperCase() + l.slice(1)
    ),
    version_type: (v.version_type as 'release' | 'beta' | 'alpha') || 'release',
    date_published: v.date_published,
    downloads: v.downloads || 0,
    files: (Array.isArray(v.files) ? v.files : []).map((f: any) => ({
      filename: f.filename,
      size: f.size,
      hashes: f.hashes || {},
      url: f.url,
      primary: Boolean(f.primary),
    })),
  };

  return { version };
}
