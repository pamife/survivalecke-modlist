'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { isValidExternalUrl } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Mod, ModStatus, ModSuggestion } from '@/types/database';

const modSchema = z.object({
  name: z.string().trim().min(2, 'Name muss mindestens 2 Zeichen lang sein.'),
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.'),
  mod_id: z.string().trim().optional(),
  modrinth_id: z.string().trim().optional(),
  curseforge_id: z.string().trim().optional(),
  description: z.string().trim().optional(),
  category: z.string().trim().min(1, 'Kategorie erforderlich.'),
  loaders: z.array(z.string()).default([]),
  minecraft_versions: z.array(z.string()).default([]),
  status: z.enum(['allowed', 'restricted', 'blocked', 'unknown']),
  reason: z.string().trim().optional(),
  restrictions: z.string().trim().optional(),
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
});

export type ModActionResult = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
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
    modrinth_id: formData.get('modrinth_id') || undefined,
    curseforge_id: formData.get('curseforge_id') || undefined,
    description: formData.get('description') || undefined,
    category: formData.get('category') || 'Allgemein',
    loaders: loadersRaw,
    minecraft_versions: mcVersionsRaw,
    status: formData.get('status') as ModStatus,
    reason: formData.get('reason') || undefined,
    restrictions: formData.get('restrictions') || undefined,
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
  const { data: insertedModData, error } = await supabase
    .from('mods')
    .insert({
      name: validated.data.name,
      slug: validated.data.slug,
      mod_id: validated.data.mod_id || null,
      modrinth_id: validated.data.modrinth_id || null,
      curseforge_id: validated.data.curseforge_id || null,
      description: validated.data.description || null,
      category: validated.data.category,
      loaders: validated.data.loaders,
      minecraft_versions: validated.data.minecraft_versions,
      status: validated.data.status,
      reason: validated.data.reason || null,
      restrictions: validated.data.restrictions || null,
      website_url: validated.data.website_url || null,
      source_url: validated.data.source_url || null,
      modrinth_url: validated.data.modrinth_url || null,
      curseforge_url: validated.data.curseforge_url || null,
      created_by: user.id,
      last_reviewed_at: new Date().toISOString(),
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

  const insertedMod = insertedModData as Mod;

  await logAuditEvent({
    action: 'CREATE_MOD',
    entityType: 'mod',
    entityId: insertedMod.id,
    entityName: insertedMod.name,
    newValues: insertedMod as unknown as Record<string, unknown>,
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
    modrinth_id: formData.get('modrinth_id') || undefined,
    curseforge_id: formData.get('curseforge_id') || undefined,
    description: formData.get('description') || undefined,
    category: formData.get('category') || 'Allgemein',
    loaders: loadersRaw,
    minecraft_versions: mcVersionsRaw,
    status: formData.get('status') as ModStatus,
    reason: formData.get('reason') || undefined,
    restrictions: formData.get('restrictions') || undefined,
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
  const oldMod = oldModData as Mod | null;

  const { data: updatedModData, error } = await supabase
    .from('mods')
    .update({
      name: validated.data.name,
      slug: validated.data.slug,
      mod_id: validated.data.mod_id || null,
      modrinth_id: validated.data.modrinth_id || null,
      curseforge_id: validated.data.curseforge_id || null,
      description: validated.data.description || null,
      category: validated.data.category,
      loaders: validated.data.loaders,
      minecraft_versions: validated.data.minecraft_versions,
      status: validated.data.status,
      reason: validated.data.reason || null,
      restrictions: validated.data.restrictions || null,
      website_url: validated.data.website_url || null,
      source_url: validated.data.source_url || null,
      modrinth_url: validated.data.modrinth_url || null,
      curseforge_url: validated.data.curseforge_url || null,
      updated_at: new Date().toISOString(),
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !updatedModData) {
    return { success: false, error: error?.message || 'Fehler beim Aktualisieren.' };
  }

  const updatedMod = updatedModData as Mod;

  await logAuditEvent({
    action: 'UPDATE_MOD',
    entityType: 'mod',
    entityId: id,
    entityName: updatedMod.name,
    oldValues: oldMod as unknown as Record<string, unknown>,
    newValues: updatedMod as unknown as Record<string, unknown>,
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
  const oldMod = oldModData as Mod | null;

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
  const { user } = await requireAdmin();
  const supabase = await createClient();

  const { data: oldSuggestionData } = await supabase
    .from('mod_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .single();

  const oldSuggestion = oldSuggestionData as ModSuggestion | null;

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
