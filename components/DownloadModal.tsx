'use client';

import React, { useEffect } from 'react';
import type { Mod, ModVersion } from '@/types/database';
import { DownloadMask } from '@/components/DownloadMask';
import { X } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  mod: Mod;
  versions: ModVersion[];
}

export function DownloadModal({ isOpen, onClose, mod, versions }: DownloadModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative max-w-2xl w-full my-8">
        {/* Close Button Floating */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3.5 -right-3.5 z-10 p-1.5 rounded-full bg-[#1e232e] text-zinc-400 hover:text-white border border-[#2d3444] transition-colors cursor-pointer shadow-lg"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        <DownloadMask mod={mod} versions={versions} onClose={onClose} />
      </div>
    </div>
  );
}
