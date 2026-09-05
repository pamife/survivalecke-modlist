import type { Metadata } from 'next';
import { InstantSearch } from '@/components/InstantSearch';
import { ShieldCheck, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Status-Prüfung',
  description: 'Prüfe sofort den Status eines Minecraft-Client-Mods auf Survivalecke.',
};

export default function CheckPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 w-full space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Schnell-Check</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Client-Mod Status prüfen
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Tippe den Namen oder die Mod-ID ein, um direkt zu sehen, ob der Mod auf Survivalecke gestattet ist.
        </p>
      </div>

      <div className="w-full">
        <InstantSearch />
      </div>

      <div className="bg-[#14161b] border border-[#232730] rounded-md p-5 text-xs text-zinc-400 space-y-2">
        <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-zinc-400" />
          <span>Was tun, wenn ein Mod nicht gefunden wird?</span>
        </div>
        <p className="leading-relaxed">
          Falls ein Mod in unserer Datenbank den Status ⚪ <strong>NOCH NICHT GEPRÜFT</strong> hat oder gar nicht auftaucht, darf er vorübergehend nicht auf Survivalecke verwendet werden. Reiche einfach einen kurzen Vorschlag über unser Formular ein – unser Server-Team prüft ihn anschließend schnellstmöglich.
        </p>
        <div className="pt-2">
          <Link
            href="/suggest"
            className="text-zinc-200 underline hover:text-white font-medium"
          >
            Hier Mod zur Prüfung vorschlagen &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
