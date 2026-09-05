'use client';

import React, { useState, useTransition } from 'react';
import { syncModExternalData } from '@/actions/syncMod';
import { RefreshCw, CheckCircle2, AlertCircle, Bell } from 'lucide-react';

interface SyncModButtonProps {
  modId: string;
  source: string;
  lastSyncedAt?: string | null;
  latestExternalVersion?: string | null;
}

export function SyncModButton({
  modId,
  source,
  lastSyncedAt,
  latestExternalVersion,
}: SyncModButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    success: boolean;
    message: string;
    newVersionsCount?: number;
  } | null>(null);

  if (source === 'manual') {
    return null;
  }

  const handleSync = () => {
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await syncModExternalData(modId);
        if (res.success) {
          setFeedback({
            success: true,
            message: res.message || 'Externe Daten erfolgreich aktualisiert.',
            newVersionsCount: res.newVersionsCount,
          });
        } else {
          setFeedback({
            success: false,
            message: res.error || 'Fehler beim Synchronisieren.',
          });
        }
      } catch (err: unknown) {
        setFeedback({
          success: false,
          message: err instanceof Error ? err.message : 'Unerwarteter Fehler.',
        });
      }
    });
  };

  const formattedSyncDate = lastSyncedAt
    ? new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(lastSyncedAt))
    : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
      {latestExternalVersion && (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300">
          <Bell className="w-3 h-3 text-amber-400" />
          <span>Neueste Modrinth-Version: {latestExternalVersion}</span>
        </span>
      )}

      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 rounded text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer shadow-sm"
        title="Aktualisiert externe Metadaten und sucht neue Versionen, ohne Survivalecke-Regeln zu überschreiben."
      >
        <RefreshCw
          className={`w-3.5 h-3.5 ${
            isPending ? 'animate-spin text-emerald-400' : 'text-zinc-400'
          }`}
        />
        <span>{isPending ? 'Synchronisiere...' : 'Modrinth synchronisieren'}</span>
      </button>

      {formattedSyncDate && !feedback && (
        <span className="text-[10px] text-zinc-500 font-mono hidden md:inline">
          Zuletzt: {formattedSyncDate}
        </span>
      )}

      {feedback && (
        <span
          className={`text-xs inline-flex items-center gap-1 ${
            feedback.success ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </span>
      )}
    </div>
  );
}
