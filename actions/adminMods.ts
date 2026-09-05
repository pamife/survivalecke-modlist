'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin, requireStaff } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { isValidExternalUrl } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Mod, ModStatus, ModSuggestion } from '@/types/database';

const restrictionItemSchema = z.object({
  title: z.string().trim().min(1, 'Titel der Einschränkung erforderlich.'),
  description: z.string().trim().min(1, 'Beschreibung der Einschränkung erforderlich.'),
});

const versionItemSchema = z.object({
  mod_version: z.string().trim().min(1),
  minecraft_version: z.string().trim().default('1.21.1'),
  loader: z.string().trim().default('Fabric'),
  status: z.enum(['allowed', 'restricted', 'blocked', 'unknown']).default('unknown'),
  note: z.string().trim().optional(),
  source_version_id: z.string().trim().optional(),
  published_at: z.string().trim().optional(),
  release_type: z.string().trim().optional(),
  changelog: z.string().trim().optional(),
  files_metadata: z.any().optional(),
});

const modSchema = z
  .object({
    name: z.string().trim().min(2, 'Name muss mindestens 2 Zeichen lang sein.'),
    slug: z
      .string()
      .trim()
      .min(2)
      .regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.'),
    mod_id: z.string().trim().optional(),
    source: z
      .enum(['modrinth', 'curseforge', 'github', 'website', 'other', 'manual'])
      .default('manual'),
    source_project_id: z.string().trim().optional(),
    icon_url: z.string().trim().optional().refine((v) => !v || isValidExternalUrl(v), 'Muss HTTPS-URL sein.'),
    modrinth_id: z.string().trim().optional(),
    curseforge_id: z.string().trim().optional(),
    description: z.string().trim().optional(),
    category: z.string().trim().min(1, 'Kategorie erforderlich.'),
    loaders: z.array(z.string()).default([]),
    minecraft_versions: z.array(z.string()).default([]),
    status: z.enum(['allowed', 'restricted', 'blocked', 'unknown']),
    reason: z.string().trim().optional(),
    website_url: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || isValidExternalUrl(v), 'Muss eine gültige HTTPS-URL sein.'),
    source_url: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || isValidExternalUrl(v), 'Muss eine gültige HTTPS-URL sein.'),
    modrinth_url: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || isValidExternalUrl(v), 'Muss eine gültige HTTPS-URL sein.'),
    curseforge_url: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || isValidExternalUrl(v), 'Muss eine gültige HTTPS-URL sein.'),
  })
  .refine(
    (data) => {
      // Reason is required if status is restricted or blocked
      if ((data.status === 'restricted' || data.status === 'blocked') && (!data.reason || data.reason.trim().length < 3)) {
        return false;
      }
      return true;
    },
    {
      message: 'Eine Begründung ist bei den Status „Eingeschränkt“ und „Verboten“ verpflichtend.',
      path: ['reason'],
    }
  );

export type ModActionResult = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  duplicate?: boolean;
  existingModId?: string;
};

export async function createMod(
  prevState: ModActionResult | null,
  formData: FormData
): Promise<ModActionResult> {
  const { user } = await requireAdmin();

  const loadersRaw = formData.getAll('loaders').map((v) => v.toString().trim()).filter(Boolean);
  const mcVersionsRaw = (formData.get('minecraft_versions') as string || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    mod_id: formData.get('mod_id') || undefined,
    source: (formData.get('source') as 'modrinth' | 'curseforge' | 'manual') || 'manual',
    source_project_id: formData.get('source_project_id') || undefined,
    icon_url: formData.get('icon_url') || undefined,
    modrinth_id: formData.get('modrinth_id') || formData.get('source_project_id') || undefined,
    curseforge_id: formData.get('curseforge_id') || undefined,
    description: formData.get('description') || undefined,
    category: formData.get('category') || 'Other',
    loaders: loadersRaw,
    minecraft_versions: mcVersionsRaw,
    status: formData.get('status') as ModStatus,
    reason: formData.get('reason') || undefined,
    website_url: formData.get('website_url') || undefined,
    source_url: formData.get('source_url') || undefined,
    modrinth_url: formData.get('modrinth_url') || undefined,
    curseforge_url: formData.get('curseforge_url') || undefined,
  };

  const validated = modSchema.safeParse(raw);
  if (!validated.success) {
    return {
      success: false,
      error: 'Validierungsfehler. Bitte Eingaben prüfen.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  // Duplicate check
  const duplicateQuery = supabase.from('mods').select('id, name, slug');
  if (validated.data.modrinth_id) {
    duplicateQuery.or(`modrinth_id.eq.${validated.data.modrinth_id},slug.eq.${validated.data.slug}`);
  } else {
    duplicateQuery.eq('slug', validated.data.slug);
  }
  const { data: existingMod } = await duplicateQuery.maybeSingle();

  if (existingMod) {
    return {
      success: false,
      duplicate: true,
      existingModId: existingMod.id,
      error: `Dieser Mod befindet sich bereits in der Datenbank: ${existingMod.name} (/${existingMod.slug})`,
    };
  }

  // Parse structured restrictions JSON
  let structuredRestrictions: Array<{ title: string; description: string }> = [];
  const restrictionsJson = formData.get('restrictions_json');
  if (restrictionsJson && typeof restrictionsJson === 'string') {
    try {
      const parsed = JSON.parse(restrictionsJson);
      if (Array.isArray(parsed)) {
        structuredRestrictions = parsed
          .map((r) => restrictionItemSchema.safeParse(r))
          .filter((res) => res.success)
          .map((res) => (res as { success: true; data: { title: string; description: string } }).data);
      }
    } catch {
      // ignore json parse err
    }
  }

  // Parse structured versions JSON
  let structuredVersions: Array<z.infer<typeof versionItemSchema>> = [];
  const versionsJson = formData.get('versions_json');
  if (versionsJson && typeof versionsJson === 'string') {
    try {
      const parsed = JSON.parse(versionsJson);
      if (Array.isArray(parsed)) {
        structuredVersions = parsed
          .map((v) => versionItemSchema.safeParse(v))
          .filter((res) => res.success)
          .map((res) => (res as { success: true; data: z.infer<typeof versionItemSchema> }).data);
      }
    } catch {
      // ignore
    }
  }

  const now = new Date().toISOString();

  // Combine restrictions text for backward compatibility
  const combinedRestrictionsText = structuredRestrictions
    .map((r) => `• ${r.title}: ${r.description}`)
    .join('\n');

  const { data: insertedModData, error } = await supabase
    .from('mods')
    .insert({
      name: validated.data.name,
      slug: validated.data.slug,
      mod_id: validated.data.mod_id || null,
      source: validated.data.source,
      source_project_id: validated.data.source_project_id || null,
      icon_url: validated.data.icon_url || null,
      modrinth_id: validated.data.modrinth_id || null,
      curseforge_id: validated.data.curseforge_id || null,
      description: validated.data.description || null,
      category: validated.data.category,
      loaders: validated.data.loaders,
      minecraft_versions: validated.data.minecraft_versions,
      status: validated.data.status,
      reason: validated.data.reason || null,
      restrictions: combinedRestrictionsText || null,
      website_url: validated.data.website_url || null,
      source_url: validated.data.source_url || null,
      modrinth_url: validated.data.modrinth_url || null,
      curseforge_url: validated.data.curseforge_url || null,
      created_by: user.id,
      last_reviewed_at: now,
      last_synced_at: validated.data.source !== 'manual' ? now : null,
    })
    .select('*')
    .single();

  if (error || !insertedModData) {
    return {
      success: false,
      error: error?.message.includes('unique')
        ? 'Ein Mod mit diesem Slug existiert bereits.'
        : `Fehler beim Erstellen: ${error?.message || 'Unbekannt'}`,
    };
  }

  const insertedMod = insertedModData as unknown as Mod;

  // Insert into mod_restrictions table
  if (structuredRestrictions.length > 0) {
    for (const r of structuredRestrictions) {
      await supabase.from('mod_restrictions').insert({
        mod_id: insertedMod.id,
        title: r.title,
        description: r.description,
      });
    }
  }

  // Insert into mod_versions table if configured
  if (structuredVersions.length > 0) {
    for (const v of structuredVersions) {
      await supabase.from('mod_versions').insert({
        mod_id: insertedMod.id,
        mod_version: v.mod_version,
        minecraft_version: v.minecraft_version,
        loader: v.loader,
        status: v.status,
        note: v.note || null,
        source_version_id: v.source_version_id || null,
        published_at: v.published_at || null,
        release_type: v.release_type || 'release',
        changelog: v.changelog || null,
        files_metadata: v.files_metadata || null,
      });
    }
  }

  await logAuditEvent({
    action: 'CREATE_MOD',
    entityType: 'mod',
    entityId: insertedMod.id,
    entityName: insertedMod.name,
    newValues: {
      mod: insertedMod,
      restrictions_count: structuredRestrictions.length,
      versions_count: structuredVersions.length,
    },
  });

  revalidatePath('/');
  revalidatePath('/mods');
  revalidatePath('/admin');
  revalidatePath('/admin/mods');

  return { success: true };
}

export async function updateMod(
  id: string,
  prevState: ModActionResult | null,
  formData: FormData
): Promise<ModActionResult> {
  await requireAdmin();

  const loadersRaw = formData.getAll('loaders').map((v) => v.toString().trim()).filter(Boolean);
  const mcVersionsRaw = (formData.get('minecraft_versions') as string || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    mod_id: formData.get('mod_id') || undefined,
    source: (formData.get('source') as 'modrinth' | 'curseforge' | 'manual') || 'manual',
    source_project_id: formData.get('source_project_id') || undefined,
    icon_url: formData.get('icon_url') || undefined,
    modrinth_id: formData.get('modrinth_id') || undefined,
    curseforge_id: formData.get('curseforge_id') || undefined,
    description: formData.get('description') || undefined,
    category: formData.get('category') || 'Other',
    loaders: loadersRaw,
    minecraft_versions: mcVersionsRaw,
    status: formData.get('status') as ModStatus,
    reason: formData.get('reason') || undefined,
    website_url: formData.get('website_url') || undefined,
    source_url: formData.get('source_url') || undefined,
    modrinth_url: formData.get('modrinth_url') || undefined,
    curseforge_url: formData.get('curseforge_url') || undefined,
  };

  const validated = modSchema.safeParse(raw);
  if (!validated.success) {
    return {
      success: false,
      error: 'Validierungsfehler. Bitte Eingaben prüfen.',
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  // Get old values for audit
  const { data: oldModData } = await supabase.from('mods').select('*').eq('id', id).single();
  const oldMod = oldModData as unknown as Mod | null;

  // Parse structured restrictions JSON
  let structuredRestrictions: Array<{ title: string; description: string }> = [];
  const restrictionsJson = formData.get('restrictions_json');
  if (restrictionsJson && typeof restrictionsJson === 'string') {
    try {
      const parsed = JSON.parse(restrictionsJson);
      if (Array.isArray(parsed)) {
        structuredRestrictions = parsed
          .map((r) => restrictionItemSchema.safeParse(r))
          .filter((res) => res.success)
          .map((res) => (res as { success: true; data: { title: string; description: string } }).data);
      }
    } catch {
      // ignore
    }
  }

  const combinedRestrictionsText = structuredRestrictions
    .map((r) => `• ${r.title}: ${r.description}`)
    .join('\n');

  const now = new Date().toISOString();

  const { data: updatedModData, error } = await supabase
    .from('mods')
    .update({
      name: validated.data.name,
      slug: validated.data.slug,
      mod_id: validated.data.mod_id || null,
      source: validated.data.source,
      source_project_id: validated.data.source_project_id || null,
      icon_url: validated.data.icon_url || null,
      modrinth_id: validated.data.modrinth_id || null,
      curseforge_id: validated.data.curseforge_id || null,
      description: validated.data.description || null,
      category: validated.data.category,
      loaders: validated.data.loaders,
      minecraft_versions: validated.data.minecraft_versions,
      status: validated.data.status,
      reason: validated.data.reason || null,
      restrictions: combinedRestrictionsText || null,
      website_url: validated.data.website_url || null,
      source_url: validated.data.source_url || null,
      modrinth_url: validated.data.modrinth_url || null,
      curseforge_url: validated.data.curseforge_url || null,
      updated_at: now,
      last_reviewed_at: now,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !updatedModData) {
    return { success: false, error: error?.message || 'Fehler beim Aktualisieren.' };
  }

  const updatedMod = updatedModData as unknown as Mod;

  // Sync mod_restrictions table
  await supabase.from('mod_restrictions').delete().eq('mod_id', id);
  if (structuredRestrictions.length > 0) {
    for (const r of structuredRestrictions) {
      await supabase.from('mod_restrictions').insert({
        mod_id: id,
        title: r.title,
        description: r.description,
      });
    }
  }

  // Parse structured versions JSON
  let structuredVersions: Array<{
    mod_version: string;
    minecraft_version: string;
    loader: string;
    status: 'allowed' | 'restricted' | 'blocked' | 'unknown';
    note?: string;
    source_version_id?: string;
    published_at?: string;
    release_type?: string;
    changelog?: string;
    files_metadata?: any;
  }> = [];
  const versionsJson = formData.get('versions_json');
  if (versionsJson && typeof versionsJson === 'string') {
    try {
      const parsedV = JSON.parse(versionsJson);
      if (Array.isArray(parsedV)) {
        structuredVersions = parsedV
          .map((v) => versionItemSchema.safeParse(v))
          .filter((res) => res.success)
          .map((res) => (res as { success: true; data: any }).data);
      }
    } catch {
      // ignore
    }
  }

  // Sync mod_versions table if versions submitted
  if (structuredVersions.length > 0) {
    await supabase.from('mod_versions').delete().eq('mod_id', id);
    for (const v of structuredVersions) {
      await supabase.from('mod_versions').insert({
        mod_id: id,
        mod_version: v.mod_version,
        minecraft_version: v.minecraft_version,
        loader: v.loader,
        status: v.status,
        note: v.note || null,
        source_version_id: v.source_version_id || null,
        published_at: v.published_at || null,
        release_type: v.release_type || 'release',
        changelog: v.changelog || null,
        files_metadata: v.files_metadata || null,
      });
    }
  }

  await logAuditEvent({
    action: 'UPDATE_MOD',
    entityType: 'mod',
    entityId: id,
    entityName: updatedMod.name,
    oldValues: oldMod as unknown as Record<string, unknown>,
    newValues: {
      mod: updatedMod,
      restrictions_count: structuredRestrictions.length,
    },
  });

  revalidatePath('/');
  revalidatePath('/mods');
  revalidatePath(`/mods/${updatedMod.slug}`);
  revalidatePath('/admin');
  revalidatePath('/admin/mods');

  return { success: true };
}

export async function deleteMod(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: oldModData } = await supabase.from('mods').select('*').eq('id', id).single();
  const oldMod = oldModData as unknown as Mod | null;

  const { error } = await supabase.from('mods').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  if (oldMod) {
    await logAuditEvent({
      action: 'DELETE_MOD',
      entityType: 'mod',
      entityId: id,
      entityName: oldMod.name,
      oldValues: oldMod as unknown as Record<string, unknown>,
    });
  }

  revalidatePath('/');
  revalidatePath('/mods');
  revalidatePath('/admin');
  revalidatePath('/admin/mods');

  return { success: true };
}

export async function reviewSuggestion(
  suggestionId: string,
  status: 'accepted' | 'rejected',
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const { user } = await requireStaff();
  const supabase = await createClient();

  const { data: oldSuggestionData } = await supabase
    .from('mod_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single();

  const oldSuggestion = oldSuggestionData as unknown as ModSuggestion | null;

  const { error } = await supabase
    .from('mod_suggestions')
    .update({
      status,
      admin_notes: adminNotes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAuditEvent({
    action: status === 'accepted' ? 'ACCEPT_SUGGESTION' : 'REJECT_SUGGESTION',
    entityType: 'suggestion',
    entityId: suggestionId,
    entityName: oldSuggestion?.mod_name || suggestionId,
    oldValues: oldSuggestion as unknown as Record<string, unknown>,
    newValues: { status, admin_notes: adminNotes },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/suggestions');

  return { success: true };
}
