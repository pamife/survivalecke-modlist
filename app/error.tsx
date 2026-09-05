'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center space-y-5 bg-[#14161b] border border-[#232730] p-8 rounded-md">
        <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800/80 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-white">Ein Fehler ist aufgetreten</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Die angeforderte Information konnte vorübergehend nicht verarbeitet werden.
          </p>
        </div>

        {error?.message && (
          <div className="text-left">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
            >
              <span>Fehlerdetails {showDetails ? 'ausblenden' : 'anzeigen'}</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              />
            </button>
            {showDetails && (
              <div className="mt-2 p-3 bg-[#0d0e11] border border-rose-900/50 rounded text-[11px] font-mono text-rose-300 break-all space-y-1">
                <p>{error.message}</p>
                {error.digest && (
                  <p className="text-zinc-400 text-[10px]">Digest: {error.digest}</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Erneut versuchen</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs rounded transition-colors"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
