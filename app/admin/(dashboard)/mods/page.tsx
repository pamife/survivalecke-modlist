import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { PlusCircle, Edit, Trash2, ExternalLink } from 'lucide-react';
import { deleteMod } from '@/actions/adminMods';
import type { Mod } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminModsPage() {
  const supabase = await createClient();
  const { data: mods } = await supabase
    .from('mods')
    .select('*')
    .order('name', { ascending: true });

  const modList = (mods || []) as unknown as Mod[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232730] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Mods verwalten
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Übersicht aller {modList.length} eingetragenen Modifikationen
          </p>
        </div>

        <Link
          href="/admin/mods/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Neuen Mod anlegen</span>
        </Link>
      </div>

      {modList.length > 0 ? (
        <div className="border border-[#232730] rounded-md overflow-hidden bg-[#14161b]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#232730] bg-[#101216] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Mod</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Kategorie</th>
                  <th className="py-3 px-4">Loader</th>
                  <th className="py-3 px-4 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222a]">
                {modList.map((mod) => (
                  <tr key={mod.id} className="hover:bg-[#181b22] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-100">{mod.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        /{mod.slug} {mod.mod_id && `• ID: ${mod.mod_id}`}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={mod.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{mod.category}</td>
                    <td className="py-3 px-4 text-zinc-300">
                      {mod.loaders?.join(', ') || '–'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/mods/${mod.slug}`}
                          target="_blank"
                          className="p-1 text-zinc-400 hover:text-zinc-200"
                          title="Öffentliche Seite öffnen"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/mods/${mod.id}/edit`}
                          className="p-1 text-zinc-400 hover:text-white"
                          title="Bearbeiten"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <form
                          action={async () => {
                            'use server';
                            await deleteMod(mod.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="p-1 text-rose-400 hover:text-rose-300"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-[#232730] rounded-md p-12 text-center bg-[#14161b] space-y-4">
          <p className="text-xs text-zinc-400">
            Noch keine Mods in der Datenbank hinterlegt (0 Mods).
          </p>
          <Link
            href="/admin/mods/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Ersten Mod eintragen</span>
          </Link>
        </div>
      )}
    </div>
  );
}
