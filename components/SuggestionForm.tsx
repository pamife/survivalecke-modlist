'use client';

import React, { useActionState } from 'react';
import { submitModSuggestion, type SuggestionState } from '@/actions/suggestMod';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface SuggestionFormProps {
  initialName?: string;
}

const initialState: SuggestionState = {};

export function SuggestionForm({ initialName = '' }: SuggestionFormProps) {
  const [state, formAction, isPending] = useActionState(submitModSuggestion, initialState);

  if (state?.success) {
    return (
      <div className="bg-[#14161b] border border-emerald-800/60 rounded-md p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white">Vorschlag eingereicht!</h3>
          <p className="text-xs text-zinc-300 max-w-md mx-auto">
            {state.message}
          </p>
        </div>
        <div className="pt-4 flex items-center justify-center gap-3 text-xs">
          <Link
            href="/mods"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition-colors"
          >
            Zurück zur Mod-Datenbank
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded transition-colors"
          >
            Weiteren Mod vorschlagen
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-5">
      {state?.error && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Mod Name */}
      <div className="space-y-1.5">
        <label htmlFor="mod_name" className="block text-xs font-semibold text-zinc-200">
          Modname <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          id="mod_name"
          name="mod_name"
          required
          defaultValue={initialName}
          placeholder="z. B. Sodium, AppleSkin, Freecam..."
          className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder-zinc-500 rounded py-2 px-3 text-xs"
        />
        {state?.fieldErrors?.mod_name && (
          <p className="text-[11px] text-rose-400">{state.fieldErrors.mod_name[0]}</p>
        )}
      </div>

      {/* Modrinth URL */}
      <div className="space-y-1.5">
        <label htmlFor="modrinth_url" className="block text-xs font-semibold text-zinc-200">
          Modrinth URL <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <input
          type="url"
          id="modrinth_url"
          name="modrinth_url"
          placeholder="https://modrinth.com/mod/..."
          className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder-zinc-500 rounded py-2 px-3 text-xs font-mono"
        />
        {state?.fieldErrors?.modrinth_url && (
          <p className="text-[11px] text-rose-400">{state.fieldErrors.modrinth_url[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Mod Version */}
        <div className="space-y-1.5">
          <label htmlFor="mod_version" className="block text-xs font-semibold text-zinc-200">
            Mod-Version
          </label>
          <input
            type="text"
            id="mod_version"
            name="mod_version"
            placeholder="z. B. 0.5.8"
            className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder-zinc-500 rounded py-2 px-3 text-xs"
          />
        </div>

        {/* Minecraft Version */}
        <div className="space-y-1.5">
          <label htmlFor="minecraft_version" className="block text-xs font-semibold text-zinc-200">
            Minecraft-Version
          </label>
          <input
            type="text"
            id="minecraft_version"
            name="minecraft_version"
            placeholder="z. B. 1.21.1"
            className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder-zinc-500 rounded py-2 px-3 text-xs"
          />
        </div>

        {/* Loader */}
        <div className="space-y-1.5">
          <label htmlFor="loader" className="block text-xs font-semibold text-zinc-200">
            Loader
          </label>
          <select
            id="loader"
            name="loader"
            className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-300 rounded py-2 px-3 text-xs"
          >
            <option value="">Nicht sicher / Beliebig</option>
            <option value="Fabric">Fabric</option>
            <option value="Forge">Forge</option>
            <option value="NeoForge">NeoForge</option>
            <option value="Quilt">Quilt</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-xs font-semibold text-zinc-200">
          Zusätzliche Hinweise <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Wofür wird der Mod genutzt? Welche Features bringt er mit?"
          className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder-zinc-500 rounded py-2 px-3 text-xs"
        />
        {state?.fieldErrors?.notes && (
          <p className="text-[11px] text-rose-400">{state.fieldErrors.notes[0]}</p>
        )}
      </div>

      <div className="pt-2 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">
          Alle Vorschläge werden manuell vom Survivalecke-Team geprüft.
        </span>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-medium rounded transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Wird übermittelt...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Vorschlag einreichen</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
