'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { isValidExternalUrl } from '@/lib/utils';

const suggestionSchema = z.object({
  mod_name: z
    .string()
    .trim()
    .min(2, 'Der Modname muss mindestens 2 Zeichen lang sein.')
    .max(100, 'Der Modname darf maximal 100 Zeichen lang sein.'),
  modrinth_url: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || isValidExternalUrl(val),
      'Bitte gib eine gültige HTTPS-URL ein (z. B. https://modrinth.com/mod/...)'
    ),
  mod_version: z.string().trim().max(50).optional(),
  minecraft_version: z.string().trim().max(50).optional(),
  loader: z.string().trim().max(50).optional(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Hinweise dürfen maximal 1000 Zeichen lang sein.')
    .optional(),
});

export type SuggestionState = {
  success?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitModSuggestion(
  prevState: SuggestionState | null,
  formData: FormData
): Promise<SuggestionState> {
  try {
    const rawData = {
      mod_name: formData.get('mod_name'),
      modrinth_url: formData.get('modrinth_url') || undefined,
      mod_version: formData.get('mod_version') || undefined,
      minecraft_version: formData.get('minecraft_version') || undefined,
      loader: formData.get('loader') || undefined,
      notes: formData.get('notes') || undefined,
    };

    const validated = suggestionSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        success: false,
        error: 'Bitte überprüfe deine Eingaben.',
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    // IP Hashing for Rate Limiting & Spam Protection (GDPR-compliant hash)
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    const realIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    const ipHash = crypto
      .createHash('sha256')
      .update(realIp + (process.env.IP_SALT || 'survivalecke_salt'))
      .digest('hex');

    const supabase = await createClient();

    // Check rate limit: max 5 suggestions per 15 minutes per IP
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('mod_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('submitter_ip_hash', ipHash)
      .gte('created_at', fifteenMinutesAgo);

    if (!countError && (count ?? 0) >= 5) {
      return {
        success: false,
        error:
          'Zu viele Anfragen in kurzer Zeit. Bitte warte einige Minuten, bevor du weitere Vorschläge einreichst.',
      };
    }

    // Insert suggestion
    const { error: insertError } = await supabase.from('mod_suggestions').insert({
      mod_name: validated.data.mod_name,
      modrinth_url: validated.data.modrinth_url || null,
      mod_version: validated.data.mod_version || null,
      minecraft_version: validated.data.minecraft_version || null,
      loader: validated.data.loader || null,
      notes: validated.data.notes || null,
      status: 'pending',
      submitter_ip_hash: ipHash,
    });

    if (insertError) {
      console.error('Failed to insert suggestion:', insertError);
      return {
        success: false,
        error: 'Fehler beim Speichern des Vorschlags. Bitte versuche es später erneut.',
      };
    }

    return {
      success: true,
      message:
        'Vielen Dank! Dein Mod-Vorschlag wurde erfolgreich eingereicht und wird vom Survivalecke-Team geprüft.',
    };
  } catch (err) {
    console.error('Unexpected error in submitModSuggestion:', err);
    return {
      success: false,
      error: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.',
    };
  }
}
