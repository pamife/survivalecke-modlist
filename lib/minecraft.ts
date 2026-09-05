/**
 * Utilities for cleaning, sorting, and formatting Minecraft version strings.
 */

export function isStableMinecraftRelease(version: string): boolean {
  return /^1\.\d+(\.\d+)?$/.test(version.trim());
}

export function parseMcVersion(version: string): [number, number, number] {
  const match = version.trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return [0, 0, 0];
  return [
    parseInt(match[1], 10) || 0,
    parseInt(match[2], 10) || 0,
    match[3] !== undefined ? parseInt(match[3], 10) : 0,
  ];
}

export function compareMcVersionsDesc(a: string, b: string): number {
  const [majA, minA, patchA] = parseMcVersion(a);
  const [majB, minB, patchB] = parseMcVersion(b);

  if (majA !== majB) return majB - majA;
  if (minA !== minB) return minB - minA;
  return patchB - patchA;
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

  // If there are stable releases, they are the primary versions.
  // If there are no stable releases at all, fallback to the raw list.
  const primary = releases.length > 0 ? releases : snapshots;

  return {
    releases,
    snapshots,
    primary: includeSnapshots ? [...releases, ...snapshots] : primary,
  };
}
