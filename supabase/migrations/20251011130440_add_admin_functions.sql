-- Add admin functions for role management
-- These functions run with elevated privileges to handle admin operations

-- Function to update user role (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Check if the current user is an admin
    SELECT role INTO current_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    -- Only allow admins to update roles
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can update user roles';
    END IF;
    
    -- Validate the new role
    IF new_role NOT IN ('admin', 'family_member') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;
    
    -- Update the user's role
    UPDATE public.user_profiles
    SET role = new_role,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Check if the update was successful
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RAISE EXCEPTION 'User not found: %', target_user_id;
    END IF;
END;
$$;

-- Function to get all users (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id UUID,
    role TEXT,
    display_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Check if the current user is an admin
    SELECT role INTO current_user_role
    FROM public.user_profiles
    WHERE id = auth.uid();
    
    -- Only allow admins to get all users
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can view all users';
    END IF;
    
    -- Return all users
    RETURN QUERY
    SELECT 
        up.id,
        up.role,
        up.display_name,
        up.created_at,
        up.updated_at
    FROM public.user_profiles up
    ORDER BY up.created_at DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
