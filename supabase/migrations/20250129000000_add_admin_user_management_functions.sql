-- Add admin user management functions
-- These functions allow admins to create users and manage passwords
-- Note: For production, consider using Supabase Edge Functions with service role key

-- Function to create a new user (admin only)
-- This function creates both the auth user and user profile
CREATE OR REPLACE FUNCTION public.admin_create_user(
    p_email TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'viewer',
    p_display_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_role TEXT;
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- Check if the current user is an admin
    SELECT role INTO v_current_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    -- Only allow admins to create users
    IF v_current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can create users';
    END IF;
    
    -- Validate the role
    IF p_role NOT IN ('admin', 'editor', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be one of: admin, editor, viewer', p_role;
    END IF;
    
    -- Validate email format
    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Validate password length
    IF LENGTH(p_password) < 6 THEN
        RAISE EXCEPTION 'Password must be at least 6 characters long';
    END IF;
    
    -- Note: This function cannot directly create auth users via SQL
    -- The actual user creation must be done via Supabase Auth Admin API
    -- This function will create the user profile once the auth user exists
    -- For now, we'll return instructions to use the Auth Admin API
    
    -- Check if user already exists in auth.users (if we can query it)
    -- This is a placeholder - actual implementation should use Edge Function
    
    RETURN jsonb_build_object(
        'success', false,
        'error', 'User creation requires Supabase Auth Admin API. Please use an Edge Function or server-side API with service role key.'
    );
END;
$$;

-- Function to update user password (admin only)
-- Note: This requires Supabase Auth Admin API - cannot be done via SQL
CREATE OR REPLACE FUNCTION public.admin_update_user_password(
    p_user_id UUID,
    p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_role TEXT;
BEGIN
    -- Check if the current user is an admin
    SELECT role INTO v_current_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    -- Only allow admins to update passwords
    IF v_current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can update user passwords';
    END IF;
    
    -- Validate password length
    IF LENGTH(p_new_password) < 6 THEN
        RAISE EXCEPTION 'Password must be at least 6 characters long';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Note: Password updates require Supabase Auth Admin API
    -- This function cannot directly update passwords via SQL
    -- For now, we'll return false and suggest using Auth Admin API
    
    RAISE EXCEPTION 'Password updates require Supabase Auth Admin API. Please use an Edge Function or server-side API with service role key.';
    
    RETURN FALSE;
END;
$$;

-- Function to update user display name (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_user_display_name(
    p_user_id UUID,
    p_display_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_role TEXT;
BEGIN
    -- Check if the current user is an admin
    SELECT role INTO v_current_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    -- Only allow admins to update display names
    IF v_current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can update user display names';
    END IF;
    
    -- Update the display name
    UPDATE public.user_profiles
    SET display_name = p_display_name,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Check if the update was successful
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
END;
$$;

