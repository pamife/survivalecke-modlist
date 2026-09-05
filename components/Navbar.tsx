import Link from 'next/link';
import { ShieldCheck, Search, PlusCircle } from 'lucide-react';

export function Navbar() {
  return (
    <header className="border-b border-[#232730] bg-[#121419]/90 sticky top-0 z-40 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-zinc-100 hover:text-white transition-colors group"
        >
          <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 group-hover:border-zinc-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-white leading-none">
              Survivalecke
            </span>
            <span className="text-[11px] text-zinc-400 font-mono tracking-wider">
              MODLIST
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/mods"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span>Alle Mods</span>
          </Link>

          <Link
            href="/suggest"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Mod vorschlagen</span>
            <span className="sm:hidden">Vorschlagen</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
