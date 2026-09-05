-- ==========================================================
-- Survivalecke Modlist - Modrinth Deep Integration Migration
-- ==========================================================

-- 1. Update mod_versions status constraint to support 'unknown'
ALTER TABLE public.mod_versions DROP CONSTRAINT IF EXISTS mod_versions_status_check;

ALTER TABLE public.mod_versions
    ADD CONSTRAINT mod_versions_status_check
    CHECK (status IN ('allowed', 'restricted', 'blocked', 'unknown'));

ALTER TABLE public.mod_versions
    ALTER COLUMN status SET DEFAULT 'unknown';

-- Add release_type, changelog, and files_metadata to mod_versions
ALTER TABLE public.mod_versions
    ADD COLUMN IF NOT EXISTS release_type text DEFAULT 'release',
    ADD COLUMN IF NOT EXISTS changelog text,
    ADD COLUMN IF NOT EXISTS files_metadata jsonb;

-- 2. Update mods source constraint to allow additional sources
ALTER TABLE public.mods DROP CONSTRAINT IF EXISTS mods_source_check;

ALTER TABLE public.mods
    ADD CONSTRAINT mods_source_check
    CHECK (source IN ('modrinth', 'curseforge', 'github', 'website', 'other', 'manual'));

ALTER TABLE public.mods
    ALTER COLUMN status SET DEFAULT 'unknown';

-- Add modrinth_metadata and latest_external_version to mods
ALTER TABLE public.mods
    ADD COLUMN IF NOT EXISTS modrinth_metadata jsonb,
    ADD COLUMN IF NOT EXISTS latest_external_version text;
