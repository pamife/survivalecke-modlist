-- ==========================================================
-- Migration: Mod Import & Structured Restrictions
-- ==========================================================

-- 1. Extend mods table with import metadata
ALTER TABLE public.mods
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('modrinth', 'curseforge', 'manual')),
    ADD COLUMN IF NOT EXISTS source_project_id TEXT,
    ADD COLUMN IF NOT EXISTS icon_url TEXT,
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_mods_source_project_id ON public.mods(source, source_project_id);
CREATE INDEX IF NOT EXISTS idx_mods_modrinth_id ON public.mods(modrinth_id);
CREATE INDEX IF NOT EXISTS idx_mods_curseforge_id ON public.mods(curseforge_id);

-- 2. Extend mod_versions with source version metadata
ALTER TABLE public.mod_versions
    ADD COLUMN IF NOT EXISTS source_version_id TEXT,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 3. Create mod_restrictions table for multiple structured restrictions per mod
CREATE TABLE IF NOT EXISTS public.mod_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mod_id UUID NOT NULL REFERENCES public.mods(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.mod_restrictions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mod_restrictions_mod_id ON public.mod_restrictions(mod_id);

-- RLS Policies for mod_restrictions
DROP POLICY IF EXISTS "Mod restrictions are viewable by everyone" ON public.mod_restrictions;
CREATE POLICY "Mod restrictions are viewable by everyone"
    ON public.mod_restrictions
    FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Admins can insert mod_restrictions" ON public.mod_restrictions;
CREATE POLICY "Admins can insert mod_restrictions"
    ON public.mod_restrictions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update mod_restrictions" ON public.mod_restrictions;
CREATE POLICY "Admins can update mod_restrictions"
    ON public.mod_restrictions
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete mod_restrictions" ON public.mod_restrictions;
CREATE POLICY "Admins can delete mod_restrictions"
    ON public.mod_restrictions
    FOR DELETE
    TO authenticated
    USING (public.is_admin());
