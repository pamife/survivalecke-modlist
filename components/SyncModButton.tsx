'use client';

import React, { useState, useTransition } from 'react';
import { syncModExternalData } from '@/actions/syncMod';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface SyncModButtonProps {
  modId: string;
  source: string;
  lastSyncedAt?: string | null;
}

export function SyncModButton({ modId, source }: SyncModButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 rounded text-xs text-zinc-200 hover:text-white transition-colors cursor-pointer"
        title="Aktualisiert Versionen und Beschreibung, ohne Survivalecke-Regeln zu überschreiben."
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
        <span>{isPending ? 'Synchronisiere...' : 'Externe Daten aktualisieren'}</span>
      </button>

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
