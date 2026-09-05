import { AdminModForm } from '@/components/AdminModForm';
import type { Mod } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    name?: string;
    modrinth_url?: string;
    minecraft_version?: string;
    loader?: string;
    notes?: string;
  }>;
}

export default async function AdminNewModPage({ searchParams }: PageProps) {
  const resolved = await searchParams;

  const initialValues: Partial<Mod> = {
    name: resolved.name || '',
    modrinth_url: resolved.modrinth_url || '',
    minecraft_versions: resolved.minecraft_version ? [resolved.minecraft_version] : [],
    loaders: resolved.loader ? [resolved.loader] : ['Fabric'],
    reason: resolved.notes || '',
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#232730] pb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Neuen Mod anlegen
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Trage eine neue Client-Modifikation in die offizielle Survivalecke Datenbank ein.
        </p>
      </div>

      <AdminModForm initialValues={initialValues} />
    </div>
  );
}
