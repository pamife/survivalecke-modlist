'use client';

import React from 'react';
import type { Mod, ModVersion } from '@/types/database';
import { DownloadMask } from '@/components/DownloadMask';
import { Download } from 'lucide-react';

interface VersionDownloadSectionProps {
  mod: Mod;
  versions: ModVersion[];
}

export function VersionDownloadSection({ mod, versions }: VersionDownloadSectionProps) {
  return (
    <section id="download" className="space-y-4 pt-4">
      <div className="flex items-center justify-between border-b border-[#232730] pb-3">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <span>Download & Versionen</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Wähle deinen Loader und deine Minecraft-Version für den direkten .jar-Download.
          </p>
        </div>
      </div>

      <DownloadMask mod={mod} versions={versions} />
    </section>
  );
}
