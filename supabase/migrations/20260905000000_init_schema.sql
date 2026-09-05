-- ==========================================================
-- Survivalecke Modlist - Database Schema & Row Level Security
-- ==========================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------
-- 1. Profiles Table (Auth & Role Management)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    );
$$;

-- RLS for profiles:
-- Users can view their own profile; Admins can view and manage all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Trigger to auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, 'user')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------
-- 2. Mods Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    mod_id TEXT,
    modrinth_id TEXT,
    curseforge_id TEXT,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Allgemein',
    loaders TEXT[] NOT NULL DEFAULT '{}',
    minecraft_versions TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL CHECK (status IN ('allowed', 'restricted', 'blocked', 'unknown')),
    reason TEXT,
    restrictions TEXT,
    website_url TEXT,
    source_url TEXT,
    modrinth_url TEXT,
    curseforge_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.mods ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mods_slug ON public.mods(slug);
CREATE INDEX IF NOT EXISTS idx_mods_status ON public.mods(status);
CREATE INDEX IF NOT EXISTS idx_mods_name ON public.mods(name);
CREATE INDEX IF NOT EXISTS idx_mods_mod_id ON public.mods(mod_id);
CREATE INDEX IF NOT EXISTS idx_mods_category ON public.mods(category);

-- RLS Policies for mods:
-- Public read access
DROP POLICY IF EXISTS "Mods are viewable by everyone" ON public.mods;
CREATE POLICY "Mods are viewable by everyone"
    ON public.mods
    FOR SELECT
    TO public
    USING (true);

-- Admin write access
DROP POLICY IF EXISTS "Admins can insert mods" ON public.mods;
CREATE POLICY "Admins can insert mods"
    ON public.mods
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update mods" ON public.mods;
CREATE POLICY "Admins can update mods"
    ON public.mods
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete mods" ON public.mods;
CREATE POLICY "Admins can delete mods"
    ON public.mods
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------
-- 3. Mod Versions Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mod_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mod_id UUID NOT NULL REFERENCES public.mods(id) ON DELETE CASCADE,
    mod_version TEXT NOT NULL,
    minecraft_version TEXT NOT NULL,
    loader TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'allowed' CHECK (status IN ('allowed', 'restricted', 'blocked')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.mod_versions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mod_versions_mod_id ON public.mod_versions(mod_id);

-- RLS Policies for mod_versions:
DROP POLICY IF EXISTS "Mod versions are viewable by everyone" ON public.mod_versions;
CREATE POLICY "Mod versions are viewable by everyone"
    ON public.mod_versions
    FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Admins can insert mod_versions" ON public.mod_versions;
CREATE POLICY "Admins can insert mod_versions"
    ON public.mod_versions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update mod_versions" ON public.mod_versions;
CREATE POLICY "Admins can update mod_versions"
    ON public.mod_versions
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete mod_versions" ON public.mod_versions;
CREATE POLICY "Admins can delete mod_versions"
    ON public.mod_versions
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------
-- 4. Mod Suggestions Table (Player Proposals)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mod_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mod_name TEXT NOT NULL,
    modrinth_url TEXT,
    mod_version TEXT,
    minecraft_version TEXT,
    loader TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    admin_notes TEXT,
    submitter_ip_hash TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.mod_suggestions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mod_suggestions_status ON public.mod_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_mod_suggestions_created_at ON public.mod_suggestions(created_at DESC);

-- RLS Policies for mod_suggestions:
-- Anyone (even anonymous) can submit a suggestion with status 'pending'
DROP POLICY IF EXISTS "Anyone can submit mod suggestions" ON public.mod_suggestions;
CREATE POLICY "Anyone can submit mod suggestions"
    ON public.mod_suggestions
    FOR INSERT
    TO public
    WITH CHECK (status = 'pending');

-- Only admins can view, update, or delete suggestions
DROP POLICY IF EXISTS "Admins can view suggestions" ON public.mod_suggestions;
CREATE POLICY "Admins can view suggestions"
    ON public.mod_suggestions
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update suggestions" ON public.mod_suggestions;
CREATE POLICY "Admins can update suggestions"
    ON public.mod_suggestions
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete suggestions" ON public.mod_suggestions;
CREATE POLICY "Admins can delete suggestions"
    ON public.mod_suggestions
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------
-- 5. Mod Reviews Table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mod_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mod_id UUID NOT NULL REFERENCES public.mods(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    decision TEXT NOT NULL CHECK (decision IN ('allowed', 'restricted', 'blocked')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.mod_reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mod_reviews_mod_id ON public.mod_reviews(mod_id);

-- RLS Policies for mod_reviews:
DROP POLICY IF EXISTS "Mod reviews are viewable by everyone" ON public.mod_reviews;
CREATE POLICY "Mod reviews are viewable by everyone"
    ON public.mod_reviews
    FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Admins can insert mod_reviews" ON public.mod_reviews;
CREATE POLICY "Admins can insert mod_reviews"
    ON public.mod_reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update mod_reviews" ON public.mod_reviews;
CREATE POLICY "Admins can update mod_reviews"
    ON public.mod_reviews
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete mod_reviews" ON public.mod_reviews;
CREATE POLICY "Admins can delete mod_reviews"
    ON public.mod_reviews
    FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ----------------------------------------------------------
-- 6. Audit Logs Table (Administrative Action Log)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    entity_name TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS Policies for audit_logs:
-- Only Admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Admins can insert audit logs (also system/server actions)
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());
