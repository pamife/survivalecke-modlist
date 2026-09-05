import Link from 'next/link';
import { InstantSearch } from '@/components/InstantSearch';
import { createClient } from '@/lib/supabase/server';
import { ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getModStats() {
  try {
    const supabase = await createClient();

    // Query exact real counts from the database
    const [allowedRes, restrictedRes, blockedRes, unknownRes] = await Promise.all([
      supabase.from('mods').select('*', { count: 'exact', head: true }).eq('status', 'allowed'),
      supabase.from('mods').select('*', { count: 'exact', head: true }).eq('status', 'restricted'),
      supabase.from('mods').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
      supabase.from('mods').select('*', { count: 'exact', head: true }).eq('status', 'unknown'),
    ]);

    return {
      allowed: allowedRes.count ?? 0,
      restricted: restrictedRes.count ?? 0,
      blocked: blockedRes.count ?? 0,
      unknown: unknownRes.count ?? 0,
    };
  } catch (err) {
    console.error('Failed to fetch mod statistics:', err);
    return {
      allowed: 0,
      restricted: 0,
      blocked: 0,
      unknown: 0,
    };
  }
}

export default async function HomePage() {
  const stats = await getModStats();

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-12 md:py-20">
      <div className="w-full max-w-4xl mx-auto space-y-12">
        {/* Header / Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offizielle Server-Datenbank</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Survivalecke Modlist
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Prüfe, ob dein Client-Mod auf Survivalecke erlaubt ist.
          </p>
        </div>

        {/* Central Prominent Search Bar */}
        <div className="w-full">
          <InstantSearch />
        </div>

        {/* Real Database Statistics - Exact Real Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
          <Link
            href="/mods?status=allowed"
            className="bg-[#14161b] hover:bg-[#1a1e26] border border-[#232730] hover:border-emerald-800/80 p-4 rounded-md text-center transition-colors block group"
          >
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-medium mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Erlaubt</span>
            </div>
            <div className="text-2xl font-bold text-zinc-100 font-mono group-hover:text-emerald-300">
              {stats.allowed}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">freigegeben</div>
          </Link>

          <Link
            href="/mods?status=restricted"
            className="bg-[#14161b] hover:bg-[#1a1e26] border border-[#232730] hover:border-amber-800/80 p-4 rounded-md text-center transition-colors block group"
          >
            <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-medium mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Eingeschränkt</span>
            </div>
            <div className="text-2xl font-bold text-zinc-100 font-mono group-hover:text-amber-300">
              {stats.restricted}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">mit Auflagen</div>
          </Link>

          <Link
            href="/mods?status=blocked"
            className="bg-[#14161b] hover:bg-[#1a1e26] border border-[#232730] hover:border-rose-800/80 p-4 rounded-md text-center transition-colors block group"
          >
            <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-medium mb-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>Verboten</span>
            </div>
            <div className="text-2xl font-bold text-zinc-100 font-mono group-hover:text-rose-300">
              {stats.blocked}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">unzulässig</div>
          </Link>

          <Link
            href="/mods?status=unknown"
            className="bg-[#14161b] hover:bg-[#1a1e26] border border-[#232730] hover:border-zinc-600 p-4 rounded-md text-center transition-colors block group"
          >
            <div className="flex items-center justify-center gap-1.5 text-zinc-400 text-xs font-medium mb-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Ungeprüft</span>
            </div>
            <div className="text-2xl font-bold text-zinc-100 font-mono group-hover:text-zinc-200">
              {stats.unknown}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">in Prüfung</div>
          </Link>
        </div>

        {/* Status Definitions Overview Panel */}
        <div className="bg-[#121419] border border-[#232730] rounded-md p-6 max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between border-b border-[#20242e] pb-3">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              Status-Richtlinien
            </h2>
            <Link
              href="/mods"
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1"
            >
              Komplette Datenbank
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 p-3 bg-[#16181f] border border-[#252933] rounded">
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>🟢 ERLAUBT</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Reine Performance-, Optik- oder HUD-Mods ohne unfaire Gameplay-Vorteile. Können uneingeschränkt genutzt werden.
              </p>
            </div>

            <div className="space-y-1 p-3 bg-[#16181f] border border-[#252933] rounded">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>🟡 EINGESCHRÄNKT</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Mods, die grundsätzlich gestattet sind, bei denen jedoch bestimmte Module (z. B. Cave-Maps, Entity-Radar) deaktiviert sein müssen.
              </p>
            </div>

            <div className="space-y-1 p-3 bg-[#16181f] border border-[#252933] rounded">
              <div className="font-semibold text-rose-400 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                <span>🔴 VERBOTEN</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Modifikationen, die unfaire Vorteile gewähren (z. B. X-Ray, Freecam, Baritone, Auto-Clicker) oder das Serverprotokoll manipulieren.
              </p>
            </div>

            <div className="space-y-1 p-3 bg-[#16181f] border border-[#252933] rounded">
              <div className="font-semibold text-zinc-400 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" />
                <span>⚪ NOCH NICHT GEPRÜFT</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Mod ist dem Team noch nicht bekannt oder wurde noch nicht bewertet. Bitte vor Benutzung zur Prüfung vorschlagen.
              </p>
            </div>
          </div>
        </div>

        {/* Direct Action Link */}
        <div className="text-center pt-2">
          <p className="text-xs text-zinc-400">
            Dein Mod fehlt in der Liste?{' '}
            <Link
              href="/suggest"
              className="text-zinc-300 underline hover:text-white transition-colors"
            >
              Jetzt zur Prüfung vorschlagen
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
