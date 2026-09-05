import Link from 'next/link';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-5 bg-[#14161b] border border-[#232730] p-8 rounded-md">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 flex items-center justify-center mx-auto">
          <HelpCircle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            404 – Seite nicht gefunden
          </div>
          <h1 className="text-xl font-bold text-white">
            Hier gibt es keinen Eintrag
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Die von dir aufgerufene URL existiert in der Survivalecke Modlist nicht oder wurde verschoben.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium rounded transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Zurück zur Startseite</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
