'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { processMinecraftVersions } from '@/lib/minecraft';
import type { Mod } from '@/types/database';
import {
  getModrinthProject,
  getModrinthProjectVersions,
  type ModrinthVersion,
} from '@/lib/modrinth';

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  newVersionsCount?: number;
  latestVersion?: string;
  hasNewVersionAlert?: boolean;
}

export async function syncModExternalData(modId: string): Promise<SyncResult> {
  await requireAdmin();
  const supabase = await createClient();

  // 1. Fetch current mod from database
  const { data: modData, error: fetchErr } = await supabase
    .from('mods')
    .select('*')
    .eq('id', modId)
    .single();

  if (fetchErr || !modData) {
    return { success: false, error: 'Mod nicht gefunden.' };
  }

  const mod = modData as unknown as Mod;

  if (mod.source === 'manual' || (!mod.source_project_id && !mod.modrinth_id)) {
    return {
      success: false,
      error: 'Dieser Mod wurde manuell ohne externe Verknüpfung angelegt.',
    };
  }

  const projectId = mod.modrinth_id || mod.source_project_id!;

  // 2. Handle Modrinth Sync
  if (mod.source === 'modrinth') {
    try {
      const { project, error: projectError } = await getModrinthProject(projectId);

      if (!project) {
        return {
          success: false,
          error: projectError || 'Modrinth konnte nicht erreicht werden oder der Mod wurde entfernt.',
        };
      }

      const loaders = Array.from(
        new Set(
          (project.loaders || []).map(
            (l: string) => l.charAt(0).toUpperCase() + l.slice(1)
          )
        )
      ) as string[];

      // 3. Fetch Versions from Modrinth
      const { versions: rawVersions, error: versionsError } = await getModrinthProjectVersions(project.id, 35);

      let newVersionsCount = 0;
      let latestVersionString: string | null = null;

      if (rawVersions && rawVersions.length > 0) {
        latestVersionString = rawVersions[0]?.version_number || null;

        // Fetch existing versions in Survivalecke DB
        const { data: existingVersions } = await supabase
          .from('mod_versions')
          .select('source_version_id, mod_version, status')
          .eq('mod_id', mod.id);

        const existingIds = new Set<string>();
        const existingVersionNumbers = new Set<string>();

        (existingVersions || []).forEach((v) => {
          if (v.source_version_id) existingIds.add(v.source_version_id);
          if (v.mod_version) existingVersionNumbers.add(v.mod_version);
        });

        // Insert new versions with STRICT 'unknown' status
        for (const v of rawVersions) {
          const alreadyExists = existingIds.has(v.id) || existingVersionNumbers.has(v.version_number);

          if (!alreadyExists) {
            await supabase.from('mod_versions').insert({
              mod_id: mod.id,
              mod_version: v.version_number,
              minecraft_version: v.game_versions?.[0] || 'Unbekannt',
              loader: (v.loaders?.[0] || 'Fabric').charAt(0).toUpperCase() + (v.loaders?.[0] || 'Fabric').slice(1),
              // CRITICAL: Newly discovered versions MUST start as 'unknown'
              status: 'unknown',
              note: null,
              source_version_id: v.id,
              published_at: v.date_published,
              release_type: v.version_type || 'release',
              changelog: v.changelog || null,
              files_metadata: v.files && v.files.length > 0 ? (v.files as any) : null,
            });
            newVersionsCount++;
          }
        }
      }

      // 4. Update external metadata ONLY - NEVER overwrite status, reason, or restrictions
      const now = new Date().toISOString();
      const updatedMetadata = {
        team: project.team,
        license: project.license?.name || null,
        client_side: project.client_side,
        server_side: project.server_side,
        updated: project.updated,
      };

      const { error: updateErr } = await supabase
        .from('mods')
        .update({
          name: project.title,
          description: project.description || mod.description,
          icon_url: project.icon_url || mod.icon_url,
          loaders: loaders.length > 0 ? loaders : mod.loaders,
          minecraft_versions: processMinecraftVersions(project.game_versions || []).primary,
          website_url: project.issues_url || project.wiki_url || mod.website_url,
          source_url: project.source_url || mod.source_url,
          modrinth_metadata: updatedMetadata,
          latest_external_version: latestVersionString,
          last_synced_at: now,
          updated_at: now,
        })
        .eq('id', mod.id);

      if (updateErr) {
        return { success: false, error: updateErr.message };
      }

      // 5. Audit Log Entry
      await logAuditEvent({
        action: 'SYNC_EXTERNAL_DATA',
        entityType: 'mod',
        entityId: mod.id,
        entityName: mod.name,
        newValues: {
          last_synced_at: now,
          new_versions_discovered: newVersionsCount,
          latest_version: latestVersionString,
          survivalecke_rules_preserved: true,
        },
      });

      // 6. Revalidate cache
      revalidatePath('/');
      revalidatePath('/mods');
      revalidatePath(`/mods/${mod.slug}`);
      revalidatePath('/admin');
      revalidatePath('/admin/mods');
      revalidatePath(`/admin/mods/${mod.id}/edit`);

      const message =
        newVersionsCount > 0
          ? `Erfolgreich mit Modrinth synchronisiert! ${newVersionsCount} neue Version(en) gefunden (Status: Ungeprüft).`
          : 'Erfolgreich synchronisiert. Keine neuen Modrinth-Versionen vorhanden.';

      return {
        success: true,
        message,
        newVersionsCount,
        latestVersion: latestVersionString || undefined,
        hasNewVersionAlert: newVersionsCount > 0,
      };
    } catch (err: unknown) {
      console.error('syncModExternalData error:', err);
      return {
        success: false,
        error:
          err instanceof Error && err.name === 'TimeoutError'
            ? 'Zeitüberschreitung bei der Anfrage an Modrinth.'
            : 'Synchronisierung fehlgeschlagen. Bitte versuche es später erneut.',
      };
    }
  }

  return { success: false, error: 'Nicht unterstützte Synchronisierungsquelle.' };
}
