'use client';

import React, { useState } from 'react';
import { fetchExternalMod, type ImportedModData } from '@/actions/importMod';
import { Download, Loader2, AlertCircle, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ModImportBarProps {
  onImportSuccess: (data: ImportedModData) => void;
  onManualToggle: (showManual: boolean) => void;
  showManualOnly: boolean;
}

export function ModImportBar({
  onImportSuccess,
  onManualToggle,
  showManualOnly,
}: ModImportBarProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateMod, setDuplicateMod] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [lastImportedName, setLastImportedName] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);
    setDuplicateMod(null);
    setLastImportedName(null);

    try {
      const res = await fetchExternalMod(trimmed);
      if (res.duplicate && res.existingMod) {
        setDuplicateMod(res.existingMod);
        setError(res.error || 'Dieser Mod befindet sich bereits in der Datenbank.');
      } else if (!res.success || !res.data) {
        setError(res.error || 'Fehler beim Laden der externen Mod-Daten.');
      } else {
        setLastImportedName(res.data.name);
        onImportSuccess(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#20242e] pb-3">
        <div>
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Automatischer Mod-Import
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Füge einen Modrinth- oder CurseForge-Link ein, um alle Daten automatisch abzurufen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onManualToggle(!showManualOnly)}
          className="text-xs text-zinc-400 hover:text-zinc-200 underline text-left sm:text-right transition-colors"
        >
          {showManualOnly ? 'Automatischen Import nutzen' : 'Oder Mod-ID manuell eingeben'}
        </button>
      </div>

      {!showManualOnly ? (
        <form onSubmit={handleImport} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://modrinth.com/mod/sodium oder https://www.curseforge.com/minecraft/mc-mods/..."
              className="flex-1 bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder-zinc-500 rounded py-2 px-3 text-xs font-mono"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !urlInput.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold rounded transition-colors shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mod laden...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Mod laden</span>
                </>
              )}
            </button>
          </div>

          {/* Error / Duplicate Alert */}
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
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

          {/* Success Banner */}
          {lastImportedName && !error && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Daten für <strong>{lastImportedName}</strong> erfolgreich geladen! Prüfe unten die Survivalecke-Regeln und klicke auf Speichern.
              </span>
            </div>
          )}
        </form>
      ) : (
        <div className="p-3 bg-[#101216] border border-[#232730] rounded text-xs text-zinc-400">
          Manueller Modus aktiv. Trage die Daten direkt in das untere Formular ein.
        </div>
      )}
    </div>
  );
}
