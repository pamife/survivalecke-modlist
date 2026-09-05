import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { AdminModForm } from '@/components/AdminModForm';
import type { Mod } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminEditModPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: modData, error } = await supabase
    .from('mods')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !modData) {
    notFound();
  }

  const mod = modData as unknown as Mod;

  return (
    <div className="space-y-6">
      <div className="border-b border-[#232730] pb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Mod bearbeiten: {mod.name}
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5 font-mono">
          ID: {mod.id} • Slug: /{mod.slug}
        </p>
      </div>

      <AdminModForm mod={mod} />
    </div>
  );
}
