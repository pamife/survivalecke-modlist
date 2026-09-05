'use client';

import React, { useState } from 'react';
import type { Mod, ModVersion } from '@/types/database';
import { DownloadModal } from '@/components/DownloadModal';
import { Download, Lock } from 'lucide-react';

interface ModDetailDownloadTriggerProps {
  mod: Mod;
  versions: ModVersion[];
}

export function ModDetailDownloadTrigger({ mod, versions }: ModDetailDownloadTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isBlocked = mod.status === 'blocked';

  if (isBlocked) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-400 text-xs font-semibold cursor-not-allowed">
        <Lock className="w-3.5 h-3.5" />
        <span>Download verboten</span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:shadow-emerald-600/20 transition-all cursor-pointer group"
      >
        <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
        <span>Download</span>
      </button>

      <DownloadModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mod={mod}
        versions={versions}
      />
    </>
  );
}
