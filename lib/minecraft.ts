/**
 * Utilities for cleaning, sorting, and formatting Minecraft version strings.
 */

export function isStableMinecraftRelease(version: string): boolean {
  return /^(?:1\.\d+(?:\.\d+)?|\d+\.\d+(?:\.\d+)?)$/.test(version.trim());
}

/**
 * Extracts numeric dot-separated segments from a version string.
 * e.g. "1.21.11" -> [1, 21, 11]
 *      "26.2" -> [26, 2]
 *      "v1.20.4-pre1" -> [1, 20, 4]
 */
export function parseVersionSegments(version: string): number[] {
  if (!version) return [];
  const cleaned = version.trim().replace(/^v/i, '');
  const match = cleaned.match(/^(\d+(?:\.\d+)*)/);
  if (!match) return [];
  return match[1].split('.').map((s) => parseInt(s, 10) || 0);
}

export function parseMcVersion(version: string): [number, number, number] {
  const segs = parseVersionSegments(version);
  return [segs[0] || 0, segs[1] || 0, segs[2] || 0];
}

/**
 * Compares two Minecraft versions in descending order (newest first).
 * Handles multi-segment numbers (e.g. 26.2 > 26.1 > 1.21.11 > 1.21.9 > 1.21.4 > 1.21.1 > 1.21 > 1.20.1).
 */
export function compareMcVersionsDesc(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const segA = parseVersionSegments(a);
  const segB = parseVersionSegments(b);
  const maxLen = Math.max(segA.length, segB.length);

  for (let i = 0; i < maxLen; i++) {
    const valA = segA[i] ?? 0;
    const valB = segB[i] ?? 0;
    if (valA !== valB) {
      return valB - valA; // Descending
    }
  }

  // If segments are numerically equal, prioritize stable releases over pre-releases (e.g. 1.21 before 1.21-rc1)
  const isPrereleaseA = a.includes('-') || a.toLowerCase().includes('pre') || a.toLowerCase().includes('rc');
  const isPrereleaseB = b.includes('-') || b.toLowerCase().includes('pre') || b.toLowerCase().includes('rc');
  if (isPrereleaseA !== isPrereleaseB) {
    return isPrereleaseA ? 1 : -1;
  }

  // Fallback: natural locale comparison descending
  return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Compares two mod version records in descending order (newest first).
 * Prioritizes published_at timestamp, then semantic versioning, then created_at.
 */
export function compareModVersionsDesc(
  a: { mod_version?: string; published_at?: string | null; created_at?: string | null },
  b: { mod_version?: string; published_at?: string | null; created_at?: string | null }
): number {
  // 1. If published_at exists and dates are different, sort by published_at descending
  if (a.published_at && b.published_at) {
    const timeA = new Date(a.published_at).getTime();
    const timeB = new Date(b.published_at).getTime();
    if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
      return timeB - timeA;
    }
  }

  // 2. Semantic version comparison of mod_version (descending)
  const semverComp = compareMcVersionsDesc(a.mod_version || '', b.mod_version || '');
  if (semverComp !== 0) return semverComp;

  // 3. Fallback to created_at
  if (a.created_at && b.created_at) {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
      return timeB - timeA;
    }
  }

  return 0;
}

/**
 * Filters and sorts Minecraft versions so that:
 * 1. Stable release versions (e.g. 1.21.4, 1.21.1, 1.20.4) are prioritized and sorted descending.
 * 2. Unstable snapshots/pre-releases are filtered out or cleanly separated.
 */
export function processMinecraftVersions(
  rawVersions: string[],
  includeSnapshots = false
): {
  releases: string[];
  snapshots: string[];
  primary: string[];
} {
  const unique = Array.from(new Set(rawVersions.map((v) => v.trim()).filter(Boolean)));

  const releases: string[] = [];
  const snapshots: string[] = [];

  for (const ver of unique) {
    if (isStableMinecraftRelease(ver)) {
      releases.push(ver);
    } else {
      snapshots.push(ver);
    }
  }

  // Sort releases descending (e.g. 1.21.4, 1.21.1, 1.21, 1.20.6...)
  releases.sort(compareMcVersionsDesc);
  snapshots.sort(compareMcVersionsDesc);

  // If there are stable releases, they are the primary versions.
  // If there are no stable releases at all, fallback to the raw list.
  const primary = releases.length > 0 ? releases : snapshots;

  return {
    releases,
    snapshots,
    primary: includeSnapshots ? [...releases, ...snapshots] : primary,
  };
}
