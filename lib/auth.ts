import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types/database';

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }
    return user;
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return null;
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return null;
    }
    return profile as Profile;
  } catch (err) {
    console.error('getCurrentProfile error:', err);
    return null;
  }
}

export async function requireAdmin(): Promise<{ user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; profile: Profile }> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/admin/login');
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    redirect('/admin/login?error=unauthorized');
  }

  return { user, profile };
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === 'admin';
}
