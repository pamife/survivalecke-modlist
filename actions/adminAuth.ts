'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z.string().min(6, 'Das Passwort muss mindestens 6 Zeichen lang sein.'),
});

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function loginAdmin(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirectTo') as string) || '/admin';

  const validated = authSchema.safeParse({ email, password });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || 'Ungültige Eingaben.' };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (authError || !authData.user) {
    return { error: 'E-Mail oder Passwort ungültig.' };
  }

  // Check admin role in profiles table
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  const profile = profileData as { role: string } | null;

  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut();
    return {
      error: 'Zugriff verweigert: Dieses Konto besitzt keine Administrator-Berechtigung.',
    };
  }

  redirect(redirectTo.startsWith('/admin') ? redirectTo : '/admin');
}

export async function setupInitialAdmin(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const validated = authSchema.safeParse({ email, password });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || 'Ungültige Eingaben.' };
  }

  const supabase = await createClient();

  // Strictly check if ANY admin exists in profiles
  const { count, error: countError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin');

  if (!countError && (count ?? 0) > 0) {
    return {
      error: 'Es existiert bereits ein Administrator. Bitte regulär einloggen.',
    };
  }

  // Create user in Supabase Auth
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (signUpError || !signUpData.user) {
    return {
      error: signUpError?.message || 'Registrierung fehlgeschlagen.',
    };
  }

  // Assign admin role to this initial user
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: signUpData.user.id,
      email: validated.data.email,
      role: 'admin',
    });

  if (profileError) {
    return {
      error: 'Benutzer erstellt, aber Admin-Rolle konnte nicht zugewiesen werden: ' + profileError.message,
    };
  }

  redirect('/admin');
}

export async function signOutAdmin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
