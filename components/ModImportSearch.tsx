'use client';

import React, { useState, useTransition } from 'react';
import {
  searchExternalMods,
  fetchExternalMod,
  type ImportedModData,
  type SearchResultItem,
} from '@/actions/importMod';
import {
  Search,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

interface ModImportSearchProps {
  onImportSuccess: (data: ImportedModData) => void;
  onManualToggle: (showManual: boolean) => void;
  showManualOnly: boolean;
}

export function ModImportSearch({
  onImportSuccess,
  onManualToggle,
  showManualOnly,
}: ModImportSearchProps) {
  const [queryInput, setQueryInput] = useState('');
  const [isSearching, startSearch] = useTransition();
  const [isFetchingFull, startFetchFull] = useTransition();
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<SearchResultItem | null>(null);
  const [fetchedData, setFetchedData] = useState<ImportedModData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateMod, setDuplicateMod] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // 1. Search Action
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = queryInput.trim();
    if (!q) return;

    setErrorMessage(null);
    setSelectedCandidate(null);
    setFetchedData(null);
    setDuplicateMod(null);

    startSearch(async () => {
      try {
        const res = await searchExternalMods(q);
        setHasSearched(true);
        if (!res.success) {
          setErrorMessage(res.error || 'Fehler bei der Suche.');
          setSearchResults([]);
        } else {
          setSearchResults(res.results);

          // If direct URL with single match, auto-select for preview
          if (res.isDirectUrl && res.results.length === 1) {
            handleSelectCandidate(res.results[0]);
          }
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Unerwarteter Suchfehler.');
        setSearchResults([]);
      }
    });
  };

  // 2. Select a Candidate from Search Results to Fetch Full Details
  const handleSelectCandidate = (candidate: SearchResultItem) => {
    setSelectedCandidate(candidate);
    setErrorMessage(null);
    setDuplicateMod(null);

    startFetchFull(async () => {
      try {
        const res = await fetchExternalMod(candidate.slug || candidate.id);
        if (res.duplicate && res.existingMod) {
          setDuplicateMod(res.existingMod);
          setErrorMessage(res.error || 'Dieser Mod existiert bereits in der Datenbank.');
        } else if (!res.success || !res.data) {
          setErrorMessage(res.error || 'Fehler beim Abrufen der vollständigen Mod-Daten.');
        } else {
          setFetchedData(res.data);
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Fehler beim Laden der Mod-Daten.');
      }
    });
  };

  // 3. Confirm Adoption into Form
  const handleAdoptData = () => {
    if (!fetchedData) return;
    onImportSuccess(fetchedData);
  };

  return (
    <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#20242e] pb-3">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Modrinth- & Quellensuche</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gib einen Mod-Namen (z. B. <code>Sodium</code>) oder eine Modrinth-URL ein.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onManualToggle(!showManualOnly)}
          className="text-xs text-zinc-400 hover:text-zinc-200 underline text-left sm:text-right transition-colors cursor-pointer"
        >
          {showManualOnly ? 'Automatische Suche nutzen' : 'Mod vollständig manuell erfassen'}
        </button>
      </div>

      {!showManualOnly ? (
        <div className="space-y-4">
          {/* Search Input Bar */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Mod-Name oder URL eingeben (z. B. Sodium oder https://modrinth.com/mod/...)"
                className="w-full bg-[#101216] border border-[#262b35] focus:border-emerald-500 focus:outline-none text-zinc-200 placeholder-zinc-500 rounded py-2 pl-9 pr-3 text-xs font-mono"
                disabled={isSearching || isFetchingFull}
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || isFetchingFull || !queryInput.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold rounded transition-colors shrink-0 cursor-pointer"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sucht...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Mod suchen</span>
                </>
              )}
            </button>
          </form>

          {/* Error / Duplicate Alert */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {duplicateMod && (
                <Link
                  href={`/admin/mods/${duplicateMod.id}/edit`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-semibold rounded border border-zinc-700 shrink-0"
                >
                  <span>Vorhandenen Mod öffnen</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          )}

          {/* Search Hits List (when multiple matches found) */}
          {hasSearched && searchResults.length > 0 && !fetchedData && (
            <div className="space-y-2">
              <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                Gefundene Treffer ({searchResults.length}):
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {searchResults.map((hit) => {
                  const isSelected = selectedCandidate?.id === hit.id;
                  return (
                    <div
                      key={`${hit.source}-${hit.id}`}
                      className={`p-3 rounded border transition-colors flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-500/60'
                          : 'bg-[#101216] border-[#222630] hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {hit.icon_url ? (
                          <img
                            src={hit.icon_url}
                            alt=""
                            className="w-8 h-8 rounded object-cover shrink-0 bg-zinc-800 border border-zinc-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-white truncate">
                              {hit.title}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                              {hit.source === 'modrinth' ? 'Modrinth' : 'DB'}
                            </span>
                            {hit.isExisting && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-800/80 text-amber-300">
                                Bereits vorhanden
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                            {hit.description || 'Keine Beschreibung verfügbar.'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                            <span>von {hit.author}</span>
                            {hit.loaders && hit.loaders.length > 0 && (
                              <span>• {hit.loaders.slice(0, 3).join(', ')}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {hit.isExisting && hit.existingId ? (
                          <Link
                            href={`/admin/mods/${hit.existingId}/edit`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition-colors"
                          >
                            <span>Öffnen</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectCandidate(hit)}
                            disabled={isFetchingFull}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded transition-colors cursor-pointer"
                          >
                            {isFetchingFull && isSelected ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ArrowRight className="w-3 h-3" />
                            )}
                            <span>Wählen</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Preview Card (Before Adopting into Form) */}
          {fetchedData && (
            <div className="p-4 bg-[#0e1014] border border-emerald-500/40 rounded-lg space-y-4 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-3 border-b border-[#1f242e] pb-3">
                <div className="flex items-center gap-3">
                  {fetchedData.icon_url ? (
                    <img
                      src={fetchedData.icon_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover bg-zinc-800 border border-zinc-700 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500">
                      <Layers className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{fetchedData.name}</h3>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                        Modrinth ✓
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      Slug: /{fetchedData.slug} • Kategorie: {fetchedData.category}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    {fetchedData.versions.length} Versionen gefunden
                  </span>
                </div>
              </div>

              {/* Mod Description Snippet */}
              <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                {fetchedData.description || 'Keine Beschreibung vorhanden.'}
              </p>

              {/* Metadata Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-[#14161b] p-2 rounded border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 uppercase block">Loader</span>
                  <span className="font-semibold text-zinc-200 font-mono">
                    {fetchedData.loaders.join(', ') || 'Fabric'}
                  </span>
                </div>
                <div className="bg-[#14161b] p-2 rounded border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 uppercase block">Minecraft</span>
                  <span className="font-semibold text-zinc-200 font-mono">
                    {fetchedData.minecraft_versions.slice(0, 4).join(', ') || '1.21.x'}
                  </span>
                </div>
                <div className="bg-[#14161b] p-2 rounded border border-zinc-800/80 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-zinc-500 uppercase block">Initialer Status</span>
                  <span className="font-semibold text-zinc-300 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />
                    <span>⚪ Unbekannt (Sicherheitsstandard)</span>
                  </span>
                </div>
              </div>

              {/* Confirmation Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1f242e]">
                <button
                  type="button"
                  onClick={() => setFetchedData(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                >
                  Andere Mod-Auswahl treffen
                </button>
                <button
                  type="button"
                  onClick={handleAdoptData}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Daten in Formular übernehmen</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 bg-[#101216] border border-[#232730] rounded text-xs text-zinc-400">
          Manueller Modus aktiv. Trage den Mod-Namen und die Survivalecke-Regeln direkt in das untere Formular ein.
        </div>
      )}
    </div>
  );
}
