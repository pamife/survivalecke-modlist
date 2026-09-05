'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, X, Filter } from 'lucide-react';
import React, { useTransition } from 'react';

interface ModFilterBarProps {
  categories: string[];
  loaders: string[];
  mcVersions: string[];
}

export function ModFilterBar({
  categories,
  loaders,
  mcVersions,
}: ModFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get('q') || '';
  const currentStatus = searchParams.get('status') || '';
  const currentLoader = searchParams.get('loader') || '';
  const currentVersion = searchParams.get('version') || '';
  const currentCategory = searchParams.get('category') || '';

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // reset pagination if any
    params.delete('page');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters =
    Boolean(currentQ) ||
    Boolean(currentStatus) ||
    Boolean(currentLoader) ||
    Boolean(currentVersion) ||
    Boolean(currentCategory);

  return (
    <div className="bg-[#14161b] border border-[#232730] rounded-md p-4 space-y-3">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            defaultValue={currentQ}
            placeholder="Modname oder Mod-ID filtern..."
            onChange={(e) => updateParam('q', e.target.value)}
            className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder-zinc-500 rounded py-2 pl-9 pr-3 text-xs"
          />
        </div>

        {/* Status Filter */}
        <select
          value={currentStatus}
          onChange={(e) => updateParam('status', e.target.value)}
          className="bg-[#101216] border border-[#262b35] text-zinc-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-zinc-500"
        >
          <option value="">Status: Alle</option>
          <option value="allowed">🟢 Erlaubt</option>
          <option value="restricted">🟡 Eingeschränkt</option>
          <option value="blocked">🔴 Verboten</option>
          <option value="unknown">⚪ Noch nicht geprüft</option>
        </select>

        {/* Loader Filter */}
        <select
          value={currentLoader}
          onChange={(e) => updateParam('loader', e.target.value)}
          className="bg-[#101216] border border-[#262b35] text-zinc-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-zinc-500"
        >
          <option value="">Loader: Alle</option>
          {loaders.map((loader) => (
            <option key={loader} value={loader}>
              {loader}
            </option>
          ))}
          {loaders.length === 0 && (
            <>
              <option value="Fabric">Fabric</option>
              <option value="Forge">Forge</option>
              <option value="NeoForge">NeoForge</option>
              <option value="Quilt">Quilt</option>
            </>
          )}
        </select>

        {/* MC Version Filter */}
        <select
          value={currentVersion}
          onChange={(e) => updateParam('version', e.target.value)}
          className="bg-[#101216] border border-[#262b35] text-zinc-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-zinc-500"
        >
          <option value="">Minecraft: Alle</option>
          {mcVersions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={currentCategory}
          onChange={(e) => updateParam('category', e.target.value)}
          className="bg-[#101216] border border-[#262b35] text-zinc-300 rounded px-3 py-2 text-xs focus:outline-none focus:border-zinc-500"
        >
          <option value="">Kategorie: Alle</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Active filters status & reset */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-[#1e222b] text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Filter aktiv {isPending && '(aktualisiert...)'}</span>
          </div>
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Filter zurücksetzen</span>
          </button>
        </div>
      )}
    </div>
  );
}
