import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AdminLoginForm } from '@/components/AdminLoginForm';
import { Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Team Login | Survivalecke',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  let hasAnyAdmin = false;

  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (!error && count !== null) {
      hasAnyAdmin = count > 0;
    }
  } catch (err) {
    console.error('Error fetching admin count in AdminLoginPage:', err);
    hasAnyAdmin = false;
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-700 text-emerald-400">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Survivalecke Team-Login
          </h1>
          <p className="text-xs text-zinc-400">
            Verwaltungsbereich für die Client-Mod-Datenbank
          </p>
        </div>

        <AdminLoginForm hasAnyAdmin={hasAnyAdmin} />
      </div>
    </div>
  );
}
