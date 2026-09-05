'use client';

import React from 'react';
import { X, FileText } from 'lucide-react';

interface VersionChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  modName: string;
  versionNumber: string;
  releaseType?: string | null;
  publishedAt?: string | null;
  changelog?: string | null;
}

export function VersionChangelogModal({
  isOpen,
  onClose,
  modName,
  versionNumber,
  releaseType = 'release',
  publishedAt,
  changelog,
}: VersionChangelogModalProps) {
  if (!isOpen) return null;

  const formattedDate = publishedAt
    ? new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(publishedAt))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#14161b] border border-[#262b35] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#20242e] flex items-center justify-between bg-[#101216]">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Changelog: {modName} v{versionNumber}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                <span className="uppercase px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                  {releaseType || 'Release'}
                </span>
                {formattedDate && <span>Veröffentlicht: {formattedDate}</span>}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs text-zinc-300">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Versions-Changelog:
          </span>
          <div className="bg-[#0e1014] border border-zinc-800 rounded-md p-3 text-zinc-300 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[55vh] overflow-y-auto">
            {changelog?.trim() || 'Kein Changelog für diese Version auf Modrinth hinterlegt.'}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#20242e] bg-[#101216] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
