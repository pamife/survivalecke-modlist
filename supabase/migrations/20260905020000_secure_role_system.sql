-- ==========================================================
-- Survivalecke Modlist - Secure Role-Based Access Control (RBAC)
-- ==========================================================

-- 1. Update profiles table constraint & migrate existing roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Migrate legacy 'user' to 'member'
UPDATE public.profiles SET role = 'member' WHERE role = 'user';

-- Ensure primary admin account is upgraded to 'owner'
UPDATE public.profiles
SET role = 'owner'
WHERE email = 'paulschon80@gmail.com';

-- Set check constraint with the new role hierarchy
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('owner', 'project_lead', 'admin', 'moderator', 'member'));

-- Default role for all new profiles is strictly 'member'
ALTER TABLE public.profiles
    ALTER COLUMN role SET DEFAULT 'member';

-- 2. Update trigger to safely assign 'member' upon user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, 'member')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

-- 3. Security Helper Functions
CREATE OR REPLACE FUNCTION public.is_staff()
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
          AND role IN ('owner', 'project_lead', 'admin', 'moderator')
    );
$$;

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
          AND role IN ('owner', 'project_lead', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
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
          AND role = 'owner'
    );
$$;

-- 4. Secure Initial Admin Claim (Permanently disabled if any admin/lead/owner exists)
CREATE OR REPLACE FUNCTION public.claim_initial_admin(admin_user_id UUID, admin_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Block permanently if ANY owner, project_lead, or admin already exists
    IF (SELECT count(*) FROM public.profiles WHERE role IN ('owner', 'project_lead', 'admin')) = 0 THEN
        INSERT INTO public.profiles (id, email, role)
        VALUES (admin_user_id, admin_email, 'owner')
        ON CONFLICT (id) DO UPDATE SET role = 'owner', email = admin_email;
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$;

-- 5. Secure Function for Role Assignment with Hierarchy Enforcement
CREATE OR REPLACE FUNCTION public.assign_user_role(target_user_id UUID, new_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_email TEXT;
    v_caller_role TEXT;
    v_target_email TEXT;
    v_target_role TEXT;
    v_owner_count INT;
BEGIN
    v_caller_id := auth.uid();

    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Nicht authentifiziert.';
    END IF;

    -- Validate new role string
    IF new_role NOT IN ('owner', 'project_lead', 'admin', 'moderator', 'member') THEN
        RAISE EXCEPTION 'Ungültige Rolle: %', new_role;
    END IF;

    -- Fetch caller profile
    SELECT role, email INTO v_caller_role, v_caller_email
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('owner', 'project_lead', 'admin') THEN
        RAISE EXCEPTION 'Keine Berechtigung zur Rollenverwaltung.';
    END IF;

    -- Fetch target user profile
    SELECT role, email INTO v_target_role, v_target_email
    FROM public.profiles
    WHERE id = target_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'Zielbenutzer nicht gefunden.';
    END IF;

    -- 1. Prevent self-elevation or self-demotion
    IF v_caller_id = target_user_id AND new_role <> v_caller_role THEN
        RAISE EXCEPTION 'Eine Änderung der eigenen Rolle ist unzulässig.';
    END IF;

    -- 2. Role escalation restrictions based on caller role:
    IF v_caller_role = 'admin' THEN
        -- Admin cannot touch owners, project_leads, or other admins
        IF v_target_role IN ('owner', 'project_lead', 'admin') THEN
            RAISE EXCEPTION 'Admins können Inhaber, Projektleiter oder Admins nicht bearbeiten.';
        END IF;
        -- Admin can only assign moderator or member
        IF new_role NOT IN ('moderator', 'member') THEN
            RAISE EXCEPTION 'Admins können nur die Rollen Moderator oder Member vergeben.';
        END IF;
    ELSIF v_caller_role = 'project_lead' THEN
        -- Project Lead cannot touch owners
        IF v_target_role = 'owner' THEN
            RAISE EXCEPTION 'Projektleiter können Inhaber nicht bearbeiten.';
        END IF;
        -- Project Lead cannot assign owner
        IF new_role = 'owner' THEN
            RAISE EXCEPTION 'Projektleiter können die Rolle Inhaber nicht vergeben.';
        END IF;
    END IF;

    -- 3. Prevent removal/demotion of the last owner
    IF v_target_role = 'owner' AND new_role <> 'owner' THEN
        SELECT count(*) INTO v_owner_count
        FROM public.profiles
        WHERE role = 'owner' AND id <> target_user_id;

        IF v_owner_count = 0 THEN
            RAISE EXCEPTION 'Der letzte Inhaber kann nicht entfernt oder herabgestuft werden.';
        END IF;
    END IF;

    -- 4. Apply role update
    UPDATE public.profiles
    SET role = new_role,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_user_id;

    -- 5. Audit Log Entry
    INSERT INTO public.audit_logs (
        user_id,
        user_email,
        action,
        entity_type,
        entity_id,
        entity_name,
        old_values,
        new_values
    ) VALUES (
        v_caller_id,
        v_caller_email,
        'ASSIGN_ROLE',
        'user',
        target_user_id,
        v_target_email,
        jsonb_build_object('role', v_target_role),
        jsonb_build_object('role', new_role)
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', target_user_id,
        'old_role', v_target_role,
        'new_role', new_role
    );
END;
$$;

-- 6. Updated RLS on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_staff());

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
