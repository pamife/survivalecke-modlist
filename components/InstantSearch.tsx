'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, ArrowRight, PlusCircle, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import type { Mod } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export function InstantSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Mod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [, startTransition] = useTransition();

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('mods')
          .select('*')
          .or(`name.ilike.%${trimmed}%,mod_id.ilike.%${trimmed}%,slug.ilike.%${trimmed}%`)
          .limit(6);

        if (!error && data) {
          setResults(data as unknown as Mod[]);
        } else {
          setResults([]);
        }
        setHasSearched(true);
      } catch (err) {
        console.error('Error searching mods:', err);
        setResults([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (results.length === 1) {
      startTransition(() => {
        router.push(`/mods/${results[0].slug}`);
      });
    } else {
      startTransition(() => {
        router.push(`/mods?q=${encodeURIComponent(query.trim())}`);
      });
    }
  };

  const statusIcons = {
    allowed: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    restricted: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    blocked: <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    unknown: <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0" />,
  };

  const statusBadges = {
    allowed: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/80',
    restricted: 'text-amber-400 bg-amber-950/50 border-amber-800/80',
    blocked: 'text-rose-400 bg-rose-950/50 border-rose-800/80',
    unknown: 'text-zinc-400 bg-zinc-800/60 border-zinc-700',
  };

  const statusLabels = {
    allowed: 'Erlaubt',
    restricted: 'Eingeschränkt',
    blocked: 'Verboten',
    unknown: 'Ungeprüft',
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Mod suchen... (z. B. Sodium, Iris, Xaeros Minimap)"
            className="w-full bg-[#16181f] border border-[#2b303c] focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 text-zinc-100 placeholder-zinc-500 rounded-md py-3.5 pl-12 pr-12 text-base transition-colors"
            autoFocus
          />
          {isLoading && (
            <Loader2 className="absolute right-4 w-5 h-5 text-zinc-400 animate-spin" />
          )}
        </div>
      </form>

      {/* Results Dropdown / Instant Status */}
      {hasSearched && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#14161b] border border-[#2b303c] rounded-md shadow-2xl z-30 overflow-hidden divide-y divide-[#232730]">
          {results.length > 0 ? (
            <div>
              <div className="px-3 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider bg-[#101216]">
                Gefundene Mods ({results.length})
              </div>
              <ul className="divide-y divide-[#1e2129]">
                {results.map((mod) => (
                  <li key={mod.id}>
                    <Link
                      href={`/mods/${mod.slug}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-[#1c1f27] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        {statusIcons[mod.status]}
                        <div>
                          <div className="text-sm font-medium text-zinc-100 group-hover:text-white flex items-center gap-2">
                            <span>{mod.name}</span>
                            {mod.mod_id && (
                              <span className="text-[11px] font-mono text-zinc-400">
                                ({mod.mod_id})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span>{mod.category}</span>
                            {mod.loaders && mod.loaders.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{mod.loaders.join(', ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded border uppercase font-medium ${statusBadges[mod.status]}`}
                        >
                          {statusLabels[mod.status]}
                        </span>
                        <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="p-2.5 bg-[#101216] text-center border-t border-[#1e2129]">
                <Link
                  href={`/mods?q=${encodeURIComponent(query.trim())}`}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1"
                >
                  Alle Ergebnisse in der Datenbank anzeigen
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            /* Unknown Mod - exact requirement #15 */
            <div className="p-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
                  ⚪ NOCH NICHT GEPRÜFT
                </div>
                <h4 className="text-base font-medium text-zinc-200 mt-1">
                  Kein Eintrag für „{query.trim()}“ gefunden
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                  Dieser Mod wurde von unserem Team bisher nicht überprüft. Verwende Mods ohne Prüfung nicht auf dem Server, um Regelverstöße zu vermeiden.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href={`/suggest?name=${encodeURIComponent(query.trim())}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 text-xs font-medium rounded transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Mod zur Prüfung vorschlagen
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
