import type { Metadata } from 'next';
import { SuggestionForm } from '@/components/SuggestionForm';
import { Info } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mod zur Prüfung vorschlagen',
  description:
    'Schlage einen neuen Client-Mod zur offiziellen Überprüfung für den Server Survivalecke vor.',
};

interface PageProps {
  searchParams: Promise<{
    name?: string;
  }>;
}

export default async function SuggestPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const initialName = resolved.name || '';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Mod zur Prüfung vorschlagen
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Reiche einen Mod ein, den du gerne auf Survivalecke nutzen möchtest. Unser Team prüft den Quellcode und die Features auf Konformität mit unseren Serverregeln.
        </p>
      </div>

      <div className="p-3.5 bg-[#14161b] border border-[#232730] rounded-md text-xs text-zinc-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-zinc-200">Wichtiger Hinweis vor dem Einreichen:</span>
          <p className="leading-relaxed">
            Nutze den Mod nicht auf Survivalecke, solange die Prüfung noch aussteht (Status ⚪ <strong>NOCH NICHT GEPRÜFT</strong>). Du kannst den Status bestehender Mods in der{' '}
            <Link href="/mods" className="text-zinc-200 underline hover:text-white">
              Mod-Datenbank
            </Link>{' '}
            nachschlagen.
          </p>
        </div>
      </div>

      <SuggestionForm initialName={initialName} />
    </div>
  );
}
