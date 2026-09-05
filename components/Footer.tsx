import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#232730] bg-[#0f1014] text-zinc-400 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-semibold text-zinc-200">
              Survivalecke Client-Mod-Datenbank
            </span>
            <p className="text-zinc-400 text-[11px] text-center md:text-left">
              Offizielle Prüfliste für erlaubte und unzulässige Modifikationen auf Survivalecke.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <Link href="/mods" className="hover:text-zinc-200 transition-colors">
              Mod-Datenbank
            </Link>
            <Link href="/suggest" className="hover:text-zinc-200 transition-colors">
              Mod vorschlagen
            </Link>
            <Link href="/mods/check" className="hover:text-zinc-200 transition-colors">
              Status-Prüfung
            </Link>
            <Link href="/admin/login" className="hover:text-zinc-200 transition-colors">
              Team Login
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span>&copy; {new Date().getFullYear()} Survivalecke. Alle Rechte vorbehalten.</span>
          <span>Minecraft ist eine eingetragene Marke von Mojang Synergies AB.</span>
        </div>
      </div>
    </footer>
  );
}
