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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    return {
      error:
        'Supabase ist in Vercel noch nicht konfiguriert. Bitte trage NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY in den Vercel Environment Variables ein und führe einen Redeploy durch.',
    };
  }

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: validated.data.email,
      password: validated.data.password,
    });

    if (authError || !authData.user) {
      return { error: authError?.message || 'E-Mail oder Passwort ungültig.' };
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
  } catch (err: unknown) {
    console.error('loginAdmin error:', err);
    return {
      error: `Verbindungsfehler (${err instanceof Error ? err.message : 'fetch failed'}). Bitte Vercel-Umgebungsvariablen prüfen.`,
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    return {
      error:
        'Supabase-Umgebungsvariablen fehlen auf Vercel! Bitte gehe in dein Vercel-Projekt -> Settings -> Environment Variables und trage NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY ein. Klicke danach auf Redeploy.',
    };
  }

  try {
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

    // 1. Create user in Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: validated.data.email,
      password: validated.data.password,
    });

    if (signUpError) {
      return {
        error: `Registrierung fehlgeschlagen: ${signUpError.message}`,
      };
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      return {
        error: 'Konto erstellt. Bitte prüfe dein Postfach auf eine Bestätigungs-E-Mail.',
      };
    }

    // 2. Safely assign admin role using SECURITY DEFINER RPC
    try {
      await supabase.rpc('claim_initial_admin', {
        admin_user_id: userId,
        admin_email: validated.data.email,
      });
    } catch (rpcErr) {
      console.error('claim_initial_admin error:', rpcErr);
    }

    // 3. Automatically sign in session if not set
    if (!signUpData.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validated.data.email,
        password: validated.data.password,
      });

      if (signInError) {
        return {
          error:
            'Konto angelegt! Falls in deinem Supabase-Projekt E-Mail-Bestätigung aktiviert ist, bestätige bitte zuerst die E-Mail und logge dich dann ein.',
        };
      }
    }
  } catch (err: unknown) {
    console.error('setupInitialAdmin error:', err);
    return {
      error: `Verbindungsfehler: ${err instanceof Error ? err.message : 'fetch failed'}. Bitte Vercel-Umgebungsvariablen prüfen.`,
    };
  }

  redirect('/admin');
}

export async function signOutAdmin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
