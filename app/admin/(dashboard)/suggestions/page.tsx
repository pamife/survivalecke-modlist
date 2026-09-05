import { createClient } from '@/lib/supabase/server';
import { formatDate, isValidExternalUrl } from '@/lib/utils';
import { reviewSuggestion } from '@/actions/adminMods';
import { ExternalLink, Check, X } from 'lucide-react';
import Link from 'next/link';
import type { ModSuggestion } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function AdminSuggestionsPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const statusFilter = resolved.status || 'pending';

  const supabase = await createClient();

  let queryBuilder = supabase
    .from('mod_suggestions')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    queryBuilder = queryBuilder.eq('status', statusFilter);
  }

  const { data: suggestions } = await queryBuilder;
  const suggestionList = (suggestions || []) as unknown as ModSuggestion[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Mod-Vorschläge
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Eingereichte Vorschläge von Spielern zur Überprüfung
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#14161b] border border-[#232730] p-1 rounded-md text-xs">
          <Link
            href="/admin/suggestions?status=pending"
            className={`px-2.5 py-1 rounded transition-colors ${
              statusFilter === 'pending'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Ausstehend
          </Link>
          <Link
            href="/admin/suggestions?status=accepted"
            className={`px-2.5 py-1 rounded transition-colors ${
              statusFilter === 'accepted'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Angenommen
          </Link>
          <Link
            href="/admin/suggestions?status=rejected"
            className={`px-2.5 py-1 rounded transition-colors ${
              statusFilter === 'rejected'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Abgelehnt
          </Link>
          <Link
            href="/admin/suggestions?status=all"
            className={`px-2.5 py-1 rounded transition-colors ${
              statusFilter === 'all'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Alle
          </Link>
        </div>
      </div>

      {suggestionList.length > 0 ? (
        <div className="space-y-3">
          {suggestionList.map((sug) => (
            <div
              key={sug.id}
              className="bg-[#14161b] border border-[#232730] rounded-md p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{sug.mod_name}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                        sug.status === 'pending'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                          : sug.status === 'accepted'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {sug.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-2 mt-1">
                    <span>Eingereicht am: {formatDate(sug.created_at)}</span>
                    {sug.loader && (
                      <>
                        <span>•</span>
                        <span>Loader: {sug.loader}</span>
                      </>
                    )}
                    {sug.minecraft_version && (
                      <>
                        <span>•</span>
                        <span>MC: {sug.minecraft_version}</span>
                      </>
                    )}
                    {sug.mod_version && (
                      <>
                        <span>•</span>
                        <span>Mod-Version: {sug.mod_version}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions for Pending */}
                {sug.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2 sm:pt-0">
                    <Link
                      href={`/admin/mods/new?name=${encodeURIComponent(
                        sug.mod_name
                      )}&modrinth_url=${encodeURIComponent(
                        sug.modrinth_url || ''
                      )}&minecraft_version=${encodeURIComponent(
                        sug.minecraft_version || ''
                      )}&loader=${encodeURIComponent(
                        sug.loader || ''
                      )}&notes=${encodeURIComponent(sug.notes || '')}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Als Mod anlegen</span>
                    </Link>

                    <form
                      action={async () => {
                        'use server';
                        await reviewSuggestion(sug.id, 'rejected', 'Abgelehnt durch Admin');
                      }}
                    >
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-300 text-zinc-400 text-xs rounded border border-zinc-700 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Ablehnen</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {sug.notes && (
                <div className="p-2.5 bg-[#101216] border border-[#20242e] rounded text-xs text-zinc-300">
                  <span className="text-[11px] text-zinc-400 block font-semibold mb-0.5">
                    Hinweis des Spielers:
                  </span>
                  {sug.notes}
                </div>
              )}

              {isValidExternalUrl(sug.modrinth_url) && (
                <div className="text-xs">
                  <a
                    href={sug.modrinth_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200 underline"
                  >
                    <span>Modrinth-Seite öffnen</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-[#232730] rounded-md p-12 text-center bg-[#14161b] text-xs text-zinc-400">
          Keine Vorschläge mit dem Status „{statusFilter}“ vorhanden.
        </div>
      )}
    </div>
  );
}
