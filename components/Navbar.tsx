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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.webp"
            alt="Survivalecke Logo"
            className="w-9 h-9 object-contain drop-shadow-md group-hover:scale-105 transition-transform shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-white leading-none">
              Survivalecke
            </span>
            <span className="text-[10px] text-emerald-400 font-mono tracking-wider font-semibold">
              MOD-DATENBANK
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
