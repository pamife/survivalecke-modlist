'use client';

import React, { useState, useMemo } from 'react';
import { Layers, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { processMinecraftVersions } from '@/lib/minecraft';

interface MinecraftVersionDisplayProps {
  versions: string[];
}

/**
 * Groups version strings by their major.minor series (e.g. "1.21.x", "1.20.x", "1.19.x")
 */
function groupVersionsBySeries(versions: string[]) {
  const groups: Record<string, string[]> = {};

  for (const ver of versions) {
    const match = ver.match(/^(\d+\.\d+)/);
    const seriesKey = match ? `${match[1]}.x` : 'Andere';
    if (!groups[seriesKey]) {
      groups[seriesKey] = [];
    }
    groups[seriesKey].push(ver);
  }

  // Sort groups descending by their series number
  const sortedSeries = Object.keys(groups).sort((a, b) => {
    const aMatch = a.match(/^(\d+)\.(\d+)/);
    const bMatch = b.match(/^(\d+)\.(\d+)/);
    if (!aMatch || !bMatch) return 0;
    const aMaj = parseInt(aMatch[1], 10);
    const bMaj = parseInt(bMatch[1], 10);
    if (aMaj !== bMaj) return bMaj - aMaj;
    return parseInt(bMatch[2], 10) - parseInt(aMatch[2], 10);
  });

  return { groups, sortedSeries };
}

/**
 * Compact header widget for the 4-column metadata grid
 */
export function MinecraftHeaderVersions({ versions }: { versions: string[] }) {
  const { releases, snapshots } = useMemo(
    () => processMinecraftVersions(versions),
    [versions]
  );

  const displayList = releases.length > 0 ? releases : snapshots;

  if (!displayList || displayList.length === 0) {
    return <div className="font-medium text-zinc-400">–</div>;
  }

  const latest = displayList[0];
  const moreCount = displayList.length - 1;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-semibold text-emerald-400 font-mono text-xs">
          {latest}
        </span>
        {moreCount > 0 && (
          <a
            href="#mc-versions"
            className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#181b22] hover:bg-[#20242e] border border-[#262b35] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Zur Versionsübersicht scrollen"
          >
            +{moreCount} weitere
          </a>
        )}
      </div>
      <div className="text-[10px] text-zinc-500">
        {releases.length > 0 ? `${releases.length} Release-Versionen` : `${displayList.length} Versionen`}
      </div>
    </div>
  );
}

/**
 * Full, organized, and searchable Minecraft versions section
 */
export function MinecraftVersionSection({ versions }: MinecraftVersionDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSnapshots, setShowSnapshots] = useState(false);

  const { releases, snapshots } = useMemo(
    () => processMinecraftVersions(versions),
    [versions]
  );

  // Grouped releases
  const { groups, sortedSeries } = useMemo(
    () => groupVersionsBySeries(releases),
    [releases]
  );

  // Filtered versions if user searches
  const filteredReleases = useMemo(() => {
    if (!searchQuery.trim()) return releases;
    const q = searchQuery.toLowerCase().trim();
    return releases.filter((v) => v.toLowerCase().includes(q));
  }, [releases, searchQuery]);

  if (versions.length === 0) {
    return null;
  }

  // By default, if there are many series, show top 3 series unless expanded or searched
  const visibleSeries = isExpanded || searchQuery.trim()
    ? sortedSeries
    : sortedSeries.slice(0, 3);

  const hiddenSeriesCount = sortedSeries.length - visibleSeries.length;

  return (
    <div id="mc-versions" className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#20242e] pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
          <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
            Unterstützte Minecraft-Versionen
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300">
            {releases.length} Releases
          </span>
        </div>

        {/* Quick filter input if there are more than 5 versions */}
        {releases.length > 5 && (
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Version suchen..."
              className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder-zinc-500 text-xs rounded pl-8 pr-2.5 py-1 font-mono"
            />
          </div>
        )}
      </div>

      {searchQuery.trim() ? (
        /* Flat filtered view when searching */
        <div className="space-y-2">
          {filteredReleases.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredReleases.map((ver) => (
                <span
                  key={ver}
                  className="px-2.5 py-1 bg-[#101216] border border-[#262b35] text-zinc-200 font-mono text-xs rounded hover:border-zinc-500 transition-colors"
                >
                  {ver}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 py-2">
              Keine Minecraft-Version gefunden für &bdquo;{searchQuery}&ldquo;.
            </p>
          )}
        </div>
      ) : (
        /* Grouped by series: 1.21.x, 1.20.x, etc. */
        <div className="space-y-4">
          {visibleSeries.map((series) => (
            <div key={series} className="space-y-1.5">
              <div className="text-[11px] font-mono text-zinc-400 font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Minecraft {series}</span>
                <span className="text-zinc-600 font-normal">
                  ({groups[series].length} Versionen)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {groups[series].map((ver, idx) => (
                  <span
                    key={ver}
                    className={`px-2 py-0.5 rounded font-mono text-xs border transition-colors ${
                      idx === 0
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 font-semibold'
                        : 'bg-[#101216] border-[#232730] text-zinc-300 hover:text-white hover:border-zinc-500'
                    }`}
                  >
                    {ver}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Toggle Expand / Collapse */}
          {hiddenSeriesCount > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium pt-1 cursor-pointer transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>{hiddenSeriesCount} ältere Version-Reihen anzeigen</span>
            </button>
          )}

          {isExpanded && sortedSeries.length > 3 && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-medium pt-1 cursor-pointer transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Weniger anzeigen</span>
            </button>
          )}
        </div>
      )}

      {/* Optional Snapshots Collapsible */}
      {snapshots.length > 0 && (
        <div className="border-t border-[#20242e] pt-3">
          <button
            type="button"
            onClick={() => setShowSnapshots(!showSnapshots)}
            className="text-[11px] text-zinc-500 hover:text-zinc-400 flex items-center gap-1 cursor-pointer"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showSnapshots ? 'rotate-180' : ''}`} />
            <span>
              {showSnapshots ? 'Snapshots & Test-Builds ausblenden' : `${snapshots.length} Snapshots & Entwickler-Builds anzeigen`}
            </span>
          </button>

          {showSnapshots && (
            <div className="flex flex-wrap gap-1.5 pt-2.5">
              {snapshots.map((snap) => (
                <span
                  key={snap}
                  className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#101216] border border-[#20242e] text-zinc-500"
                >
                  {snap}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
