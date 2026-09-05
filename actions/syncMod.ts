'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import type { Mod } from '@/types/database';

export async function syncModExternalData(modId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  await requireAdmin();
  const supabase = await createClient();

  // Fetch current mod from database
  const { data: modData, error: fetchErr } = await supabase
    .from('mods')
    .select('*')
    .eq('id', modId)
    .single();

  if (fetchErr || !modData) {
    return { success: false, error: 'Mod nicht gefunden.' };
  }

  const mod = modData as unknown as Mod;

  if (mod.source === 'manual' || !mod.source_project_id) {
    return {
      success: false,
      error: 'Dieser Mod wurde manuell ohne externe Verknüpfung angelegt.',
    };
  }

  // Handle Modrinth Sync
  if (mod.source === 'modrinth') {
    try {
      const res = await fetch(
        `https://api.modrinth.com/v2/project/${encodeURIComponent(mod.source_project_id)}`,
        {
          headers: {
            'User-Agent': 'Survivalecke-Modlist/1.0 (admin@survivalecke.de)',
          },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!res.ok) {
        return {
          success: false,
          error: 'Modrinth konnte nicht erreicht werden oder der Mod wurde entfernt.',
        };
      }

      const project = await res.json();

      const loaders = Array.from(
        new Set(
          (project.loaders || []).map(
            (l: string) => l.charAt(0).toUpperCase() + l.slice(1)
          )
        )
      ) as string[];

      // Fetch versions
      const versionsRes = await fetch(
        `https://api.modrinth.com/v2/project/${encodeURIComponent(project.id)}/version`,
        {
          headers: {
            'User-Agent': 'Survivalecke-Modlist/1.0 (admin@survivalecke.de)',
          },
          signal: AbortSignal.timeout(8000),
        }
      );

      let newVersionsCount = 0;
      if (versionsRes.ok) {
        const rawVersions = await versionsRes.json();
        if (Array.isArray(rawVersions)) {
          // Fetch existing versions for this mod
          const { data: existingVersions } = await supabase
            .from('mod_versions')
            .select('source_version_id, mod_version')
            .eq('mod_id', mod.id);

          const existingIds = new Set(
            (existingVersions || []).map((v) => v.source_version_id || v.mod_version)
          );

          for (const v of rawVersions.slice(0, 30)) {
            if (!existingIds.has(v.id) && !existingIds.has(v.version_number)) {
              await supabase.from('mod_versions').insert({
                mod_id: mod.id,
                mod_version: v.version_number,
                minecraft_version: v.game_versions?.[0] || 'Unbekannt',
                loader: (v.loaders?.[0] || 'Fabric').charAt(0).toUpperCase() + (v.loaders?.[0] || 'Fabric').slice(1),
                status: 'allowed', // or inherited
                source_version_id: v.id,
                published_at: v.date_published,
              });
              newVersionsCount++;
            }
          }
        }
      }

      // Update external metadata ONLY - NEVER overwrite status, reason, or restrictions
      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('mods')
        .update({
          name: project.title,
          description: project.description || mod.description,
          icon_url: project.icon_url || mod.icon_url,
          loaders: loaders.length > 0 ? loaders : mod.loaders,
          minecraft_versions: (project.game_versions || []).reverse(),
          website_url: project.issues_url || project.wiki_url || mod.website_url,
          source_url: project.source_url || mod.source_url,
          last_synced_at: now,
          updated_at: now,
        })
        .eq('id', mod.id);

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }

      await logAuditEvent({
        action: 'SYNC_EXTERNAL_DATA',
        entityType: 'mod',
        entityId: mod.id,
        entityName: mod.name,
        newValues: {
          last_synced_at: now,
          new_versions_added: newVersionsCount,
        },
      });

      revalidatePath('/');
      revalidatePath('/mods');
      revalidatePath(`/mods/${mod.slug}`);
      revalidatePath('/admin');
      revalidatePath('/admin/mods');
      revalidatePath(`/admin/mods/${mod.id}/edit`);

      return {
        success: true,
        message: `Erfolgreich synchronisiert. ${newVersionsCount} neue Version(en) gefunden.`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error:
          err instanceof Error && err.name === 'TimeoutError'
            ? 'Zeitüberschreitung bei der Anfrage an Modrinth.'
            : 'Synchronisierung fehlgeschlagen. Bitte versuche es später erneut.',
      };
    }
  }

  // Handle CurseForge Sync
  if (mod.source === 'curseforge') {
    const cfApiKey = process.env.CURSEFORGE_API_KEY;
    if (!cfApiKey) {
      return {
        success: false,
        error: 'CurseForge-Integration ist nicht konfiguriert (CURSEFORGE_API_KEY fehlt).',
      };
    }
    // Future expansion for CF
  }

  return { success: false, error: 'Unbekannte Quelle.' };
}
