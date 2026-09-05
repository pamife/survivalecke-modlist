import Link from 'next/link';
import { HelpCircle, PlusCircle, ArrowLeft } from 'lucide-react';

export default function ModNotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400">
        <HelpCircle className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold uppercase tracking-wider">
          ⚪ NOCH NICHT GEPRÜFT
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Mod nicht in der Datenbank gefunden
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          Dieser Mod wurde von unserem Team bisher nicht überprüft. Verwende Mods ohne Prüfung bitte vorerst nicht auf dem Server Survivalecke, um versehentliche Regelverstöße zu vermeiden.
        </p>
      </div>

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/suggest"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Mod zur Prüfung vorschlagen</span>
        </Link>
        <Link
          href="/mods"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium rounded transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zur Mod-Liste</span>
        </Link>
      </div>
    </div>
  );
}
