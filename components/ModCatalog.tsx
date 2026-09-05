'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Search,
  X,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  PlusCircle,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Layers,
  Cpu,
  Download,
} from 'lucide-react';
import type { ModWithRestrictions, ModStatus } from '@/types/database';

interface ModCatalogProps {
  mods: ModWithRestrictions[];
  categories: string[];
  loaders: string[];
  mcVersions: string[];
  statusCounts: {
    total: number;
    allowed: number;
    restricted: number;
    blocked: number;
    unknown: number;
  };
  initialQuery?: string;
  initialStatus?: string;
  initialLoader?: string;
  initialVersion?: string;
  initialCategory?: string;
  initialSort?: string;
}

export function ModCatalog({
  mods,
  categories,
  loaders,
  mcVersions,
  statusCounts,
  initialQuery = '',
  initialStatus = '',
  initialLoader = '',
  initialVersion = '',
  initialCategory = '',
  initialSort = 'name_asc',
}: ModCatalogProps) {
  // Local state for instant (0ms) responsive UI
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [selectedLoader, setSelectedLoader] = useState<string>(initialLoader);
  const [selectedVersion, setSelectedVersion] = useState<string>(initialVersion);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [sortOrder, setSortOrder] = useState<string>(initialSort);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state when user navigates with browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSearchQuery(params.get('q') || '');
      setSelectedStatus(params.get('status') || '');
      setSelectedLoader(params.get('loader') || '');
      setSelectedVersion(params.get('version') || '');
      setSelectedCategory(params.get('category') || '');
      setSortOrder(params.get('sort') || 'name_asc');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Debounced URL synchronization (updates address bar without server re-fetching)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedLoader) params.set('loader', selectedLoader);
      if (selectedVersion) params.set('version', selectedVersion);
      if (selectedCategory) params.set('category', selectedCategory);
      if (sortOrder && sortOrder !== 'name_asc') params.set('sort', sortOrder);

      const qs = params.toString();
      const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;

      // Only update if URL actually changed to avoid polluting browser state
      if (window.location.search !== (qs ? `?${qs}` : '')) {
        window.history.replaceState(null, '', newUrl);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedStatus, selectedLoader, selectedVersion, selectedCategory, sortOrder]);

  // Keyboard shortcut: pressing "/" or "Ctrl+K" focuses search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchQuery('');
    setSelectedStatus('');
    setSelectedLoader('');
    setSelectedVersion('');
    setSelectedCategory('');
    setSortOrder('name_asc');
  }, []);

  const handleStatusToggle = (statusVal: string) => {
    setSelectedStatus((prev) => (prev === statusVal ? '' : statusVal));
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(selectedStatus) ||
    Boolean(selectedLoader) ||
    Boolean(selectedVersion) ||
    Boolean(selectedCategory) ||
    sortOrder !== 'name_asc';

  // Instant client-side filtering and sorting (0ms latency, 60fps)
  const filteredMods = useMemo(() => {
    let list = mods;

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => {
        const nameMatch = m.name?.toLowerCase().includes(q);
        const slugMatch = m.slug?.toLowerCase().includes(q);
        const idMatch = m.mod_id?.toLowerCase().includes(q);
        const descMatch = m.description?.toLowerCase().includes(q);
        const catMatch = m.category?.toLowerCase().includes(q);
        return nameMatch || slugMatch || idMatch || descMatch || catMatch;
      });
    }

    // 2. Status Filter
    if (selectedStatus) {
      list = list.filter((m) => m.status === selectedStatus);
    }

    // 3. Loader Filter
    if (selectedLoader) {
      list = list.filter((m) => m.loaders?.includes(selectedLoader));
    }

    // 4. Minecraft Version Filter
    if (selectedVersion) {
      list = list.filter((m) => m.minecraft_versions?.includes(selectedVersion));
    }

    // 5. Category Filter
    if (selectedCategory) {
      list = list.filter((m) => m.category === selectedCategory);
    }

    // 6. Sorting
    if (sortOrder === 'name_desc') {
      return [...list].sort((a, b) => b.name.localeCompare(a.name));
    }
    if (sortOrder === 'date_desc') {
      return [...list].sort((a, b) => {
        const timeA = new Date(a.last_reviewed_at || a.updated_at || a.created_at).getTime();
        const timeB = new Date(b.last_reviewed_at || b.updated_at || b.created_at).getTime();
        return timeB - timeA;
      });
    }
    if (sortOrder === 'status') {
      const order: Record<ModStatus, number> = {
        allowed: 1,
        restricted: 2,
        unknown: 3,
        blocked: 4,
      };
      return [...list].sort((a, b) => (order[a.status] || 5) - (order[b.status] || 5));
    }

    // Default: name_asc
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [mods, searchQuery, selectedStatus, selectedLoader, selectedVersion, selectedCategory, sortOrder]);

  return (
    <div className="space-y-5 pb-[env(safe-area-inset-bottom)]">
      {/* Search Input Box */}
      <div className="relative">
        <label htmlFor="mod-search-input" className="sr-only">
          Mod suchen
        </label>
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={searchInputRef}
          id="mod-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔎 Nach einem Mod suchen (z. B. Sodium, Minimap, Fabric API)... [Drücke /]"
          className="w-full bg-[#14161b] border border-[#232730] focus:border-zinc-500 focus:outline-none text-zinc-100 placeholder-zinc-500 rounded-lg py-3 pl-10 pr-10 text-sm transition-colors shadow-inner"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
            title="Suche leeren"
            aria-label="Sucheingabe löschen"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Primary Status Filter Pills (The most critical UX element) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
        {/* Alle */}
        <button
          type="button"
          onClick={() => setSelectedStatus('')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
            !selectedStatus
              ? 'bg-zinc-200 text-zinc-900 shadow'
              : 'bg-[#14161b] text-zinc-400 hover:text-zinc-200 border border-[#232730] hover:border-zinc-600'
          }`}
        >
          <span>Alle</span>
          <span
            className={`text-[11px] px-1.5 py-0.2 rounded font-mono ${
              !selectedStatus ? 'bg-zinc-300 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {statusCounts.total}
          </span>
        </button>

        {/* Erlaubt */}
        <button
          type="button"
          onClick={() => handleStatusToggle('allowed')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
            selectedStatus === 'allowed'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
              : 'bg-[#14161b] text-zinc-300 hover:text-emerald-300 border border-[#232730] hover:border-emerald-800/60'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Erlaubt</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded font-mono bg-emerald-950/90 border border-emerald-800/60 text-emerald-400">
            {statusCounts.allowed}
          </span>
        </button>

        {/* Eingeschränkt */}
        <button
          type="button"
          onClick={() => handleStatusToggle('restricted')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
            selectedStatus === 'restricted'
              ? 'bg-amber-950/80 text-amber-300 border border-amber-500 shadow-sm ring-1 ring-amber-500/30'
              : 'bg-[#14161b] text-zinc-300 hover:text-amber-300 border border-[#232730] hover:border-amber-800/60'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Eingeschränkt</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded font-mono bg-amber-950/90 border border-amber-800/60 text-amber-400">
            {statusCounts.restricted}
          </span>
        </button>

        {/* Verboten */}
        <button
          type="button"
          onClick={() => handleStatusToggle('blocked')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
            selectedStatus === 'blocked'
              ? 'bg-rose-950/80 text-rose-300 border border-rose-500 shadow-sm ring-1 ring-rose-500/30'
              : 'bg-[#14161b] text-zinc-300 hover:text-rose-300 border border-[#232730] hover:border-rose-800/60'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>Verboten</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded font-mono bg-rose-950/90 border border-rose-800/60 text-rose-400">
            {statusCounts.blocked}
          </span>
        </button>

        {/* Ungeprüft */}
        <button
          type="button"
          onClick={() => handleStatusToggle('unknown')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
            selectedStatus === 'unknown'
              ? 'bg-zinc-800 text-zinc-200 border border-zinc-500 shadow-sm'
              : 'bg-[#14161b] text-zinc-400 hover:text-zinc-200 border border-[#232730] hover:border-zinc-600'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>Ungeprüft</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
            {statusCounts.unknown}
          </span>
        </button>
      </div>

      {/* Secondary Filters Bar */}
      <div className="bg-[#14161b] border border-[#232730] rounded-lg p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Loader Select */}
            <select
              value={selectedLoader}
              onChange={(e) => setSelectedLoader(e.target.value)}
              className="bg-[#101216] border border-[#262b35] text-zinc-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              <option value="">Alle Loader</option>
              {loaders.map((ldr) => (
                <option key={ldr} value={ldr}>
                  {ldr}
                </option>
              ))}
            </select>

            {/* Minecraft Version Select */}
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="bg-[#101216] border border-[#262b35] text-zinc-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-500 cursor-pointer font-mono"
            >
              <option value="">Alle MC-Versionen</option>
              {mcVersions.map((v) => (
                <option key={v} value={v}>
                  MC {v}
                </option>
              ))}
            </select>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#101216] border border-[#262b35] text-zinc-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              <option value="">Alle Kategorien</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Right Side: Sort & View Toggle */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-[#101216] border border-[#262b35] text-zinc-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-zinc-500 cursor-pointer"
            >
              <option value="name_asc">Sortierung: Name A → Z</option>
              <option value="name_desc">Sortierung: Name Z → A</option>
              <option value="status">Sortierung: Nach Status</option>
              <option value="date_desc">Sortierung: Neueste Prüfung</option>
            </select>

            {/* Desktop View Mode Toggle */}
            <div className="hidden md:flex items-center border border-[#262b35] rounded overflow-hidden bg-[#101216]">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Kartenansicht"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Tabellenansicht"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1e222b] text-xs">
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
              <span>Aktive Filter:</span>
            </span>

            {searchQuery.trim() && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] transition-colors cursor-pointer"
              >
                <span>Suche: &bdquo;{searchQuery.trim()}&ldquo;</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {selectedStatus && (
              <button
                type="button"
                onClick={() => setSelectedStatus('')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] transition-colors cursor-pointer"
              >
                <span>
                  Status:{' '}
                  {selectedStatus === 'allowed'
                    ? 'Erlaubt'
                    : selectedStatus === 'restricted'
                    ? 'Eingeschränkt'
                    : selectedStatus === 'blocked'
                    ? 'Verboten'
                    : 'Ungeprüft'}
                </span>
                <X className="w-3 h-3" />
              </button>
            )}

            {selectedLoader && (
              <button
                type="button"
                onClick={() => setSelectedLoader('')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] transition-colors cursor-pointer"
              >
                <span>Loader: {selectedLoader}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {selectedVersion && (
              <button
                type="button"
                onClick={() => setSelectedVersion('')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] transition-colors cursor-pointer"
              >
                <span>MC: {selectedVersion}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] transition-colors cursor-pointer"
              >
                <span>Kategorie: {selectedCategory}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-zinc-400 hover:text-white underline ml-1 cursor-pointer transition-colors"
            >
              Alle Filter zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <div>
          <span>
            {filteredMods.length} {filteredMods.length === 1 ? 'Mod' : 'Mods'} gefunden
          </span>
        </div>
      </div>

      {/* MODS LIST */}
      {filteredMods.length > 0 ? (
        viewMode === 'table' ? (
          /* DESKTOP TABLE VIEW */
          <div className="border border-[#232730] rounded-lg overflow-hidden bg-[#14161b]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#232730] bg-[#101216] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Mod</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Auflagen / Details</th>
                    <th className="py-3 px-4">Loader</th>
                    <th className="py-3 px-4">Minecraft</th>
                    <th className="py-3 px-4">Kategorie</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e222a]">
                  {filteredMods.map((mod) => (
                    <tr
                      key={mod.id}
                      className="hover:bg-[#181b22] transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/mods/${mod.slug}`}
                          className="flex items-center gap-3 text-zinc-100 group-hover:text-white"
                        >
                          {mod.icon_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mod.icon_url}
                              alt=""
                              className="w-8 h-8 rounded bg-zinc-800 object-cover border border-[#232730] shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-zinc-800 border border-[#232730] flex items-center justify-center text-zinc-500 font-bold text-xs shrink-0">
                              {mod.name.charAt(0) || 'M'}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-semibold">{mod.name}</span>
                            {mod.mod_id && (
                              <span className="text-[11px] text-zinc-400 font-mono">
                                /{mod.slug}
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={mod.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {mod.status === 'restricted' ? (
                          mod.mod_restrictions && mod.mod_restrictions.length > 0 ? (
                            <span className="text-[11px] text-amber-300 flex items-center gap-1 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{mod.mod_restrictions.length} Auflage(n) aktiv</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-300">
                              Nutzung mit Einschränkungen
                            </span>
                          )
                        ) : mod.status === 'blocked' ? (
                          <span className="text-[11px] text-rose-300">
                            Auf Survivalecke nicht gestattet
                          </span>
                        ) : mod.status === 'unknown' ? (
                          <span className="text-[11px] text-zinc-400">
                            Noch nicht bewertet
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-400">
                            Ohne Einschränkung erlaubt
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {mod.loaders && mod.loaders.length > 0
                          ? mod.loaders.join(', ')
                          : '–'}
                      </td>
                      <td className="py-3 px-4 text-zinc-300 font-mono text-[11px]">
                        {mod.minecraft_versions && mod.minecraft_versions.length > 0
                          ? mod.minecraft_versions.slice(0, 2).join(', ') +
                            (mod.minecraft_versions.length > 2
                              ? ` (+${mod.minecraft_versions.length - 2})`
                              : '')
                          : '–'}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        <span className="px-2 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/60 text-[11px]">
                          {mod.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {mod.status !== 'blocked' && (
                            <Link
                              href={`/mods/${mod.slug}#download`}
                              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-white transition-colors"
                              title="Download & Versionen"
                            >
                              <Download className="w-3 h-3 text-emerald-400" />
                              <span>Download</span>
                            </Link>
                          )}
                          <Link
                            href={`/mods/${mod.slug}`}
                            className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                            aria-label={`Details zu ${mod.name}`}
                          >
                            <span>Prüfen</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* COMPACT CARDS / LIST VIEW (Default, highly legible) */
          <div className="grid grid-cols-1 gap-3">
            {filteredMods.map((mod) => (
              <div
                key={mod.id}
                className="bg-[#14161b] border border-[#232730] hover:border-zinc-600 rounded-lg p-4 sm:p-5 transition-colors relative group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Icon & Meta */}
                  <div className="flex items-start gap-3.5">
                    {mod.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mod.icon_url}
                        alt=""
                        className="w-11 h-11 rounded-lg bg-zinc-800 object-cover border border-[#232730] shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-[#232730] flex items-center justify-center text-zinc-400 font-bold text-base shrink-0">
                        {mod.name.charAt(0) || 'M'}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/mods/${mod.slug}`}
                          className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors"
                        >
                          {mod.name}
                        </Link>
                        <span className="text-[11px] font-mono text-zinc-500">
                          /{mod.slug}
                        </span>
                      </div>

                      {/* Tag list */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-[10px] uppercase font-mono text-zinc-300">
                          {mod.category}
                        </span>

                        {mod.loaders && mod.loaders.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-300">
                            <Cpu className="w-3 h-3 text-zinc-500" />
                            <span>{mod.loaders.join(', ')}</span>
                          </span>
                        )}

                        {mod.minecraft_versions && mod.minecraft_versions.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                            <Layers className="w-3 h-3 text-zinc-500" />
                            <span>
                              MC {mod.minecraft_versions.slice(0, 2).join(', ')}
                              {mod.minecraft_versions.length > 2 && (
                                <span className="text-zinc-500">
                                  {' '}(+{mod.minecraft_versions.length - 2})
                                </span>
                              )}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Big, Prominent Status Badge */}
                  <div className="shrink-0 self-start sm:self-auto">
                    <StatusBadge status={mod.status} size="md" />
                  </div>
                </div>

                {/* Description (If present) */}
                {mod.description && (
                  <p className="text-xs text-zinc-300 pt-2.5 line-clamp-2 leading-relaxed">
                    {mod.description}
                  </p>
                )}

                {/* RESTRICTION HIGHLIGHT BOX (When status is restricted) */}
                {mod.status === 'restricted' && (
                  <div className="mt-3 p-3 bg-amber-950/20 border border-amber-800/40 rounded-md space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Auflagen auf Survivalecke:</span>
                      </span>
                      <Link
                        href={`/mods/${mod.slug}`}
                        className="text-[11px] text-amber-400 hover:text-amber-200 underline font-normal"
                      >
                        Vollständige Regeln →
                      </Link>
                    </div>

                    {mod.mod_restrictions && mod.mod_restrictions.length > 0 ? (
                      <ul className="space-y-1 text-xs text-amber-200">
                        {mod.mod_restrictions.slice(0, 3).map((r) => (
                          <li key={r.id} className="flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold">•</span>
                            <span className="line-clamp-1">{r.title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-amber-200 line-clamp-1">
                        {mod.restrictions ||
                          'Dieser Mod darf nur unter bestimmten Auflagen verwendet werden.'}
                      </p>
                    )}
                  </div>
                )}

                {/* UNKNOWN STATUS NOTICE */}
                {mod.status === 'unknown' && (
                  <div className="mt-3 p-2.5 bg-[#101216] border border-[#232730] rounded text-[11px] text-zinc-400 flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>
                      Dieser Mod wurde von Survivalecke noch nicht geprüft. Die Nutzung erfolgt auf eigenes Risiko.
                    </span>
                  </div>
                )}

                {/* Footer Link to details & direct download */}
                <div className="pt-3 mt-3 border-t border-[#1e222b] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-500">
                    {mod.source && mod.source !== 'manual' && (
                      <span className="capitalize">Quelle: {mod.source}</span>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    {mod.status !== 'blocked' && (
                      <Link
                        href={`/mods/${mod.slug}#download`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-white transition-colors"
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                        <span>Download</span>
                      </Link>
                    )}

                    <Link
                      href={`/mods/${mod.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition-colors"
                    >
                      <span>Zur Mod-Prüfung</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* EMPTY STATE */
        <div className="border border-[#232730] rounded-lg p-12 text-center bg-[#14161b] space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Keine Mods gefunden
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Für deine aktuellen Filter- und Suchkriterien liegen keine Einträge vor.'
                : 'In der Datenbank sind derzeit noch keine Mods eingetragen.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded transition-colors cursor-pointer"
              >
                Filter zurücksetzen
              </button>
            )}

            <Link
              href={searchQuery.trim() ? `/suggest?name=${encodeURIComponent(searchQuery.trim())}` : '/suggest'}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Diesen Mod zur Prüfung vorschlagen</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
