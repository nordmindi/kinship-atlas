-- Add get_all_users function for admin user management
-- This function allows admins to retrieve all users

-- Function to get all users (admin only)
-- Includes email from auth.users for better display
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id UUID,
    role TEXT,
    display_name TEXT,
    email TEXT,
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
    SELECT up.role INTO current_user_role
    FROM public.user_profiles up
    WHERE up.id = auth.uid();
    
    -- Only allow admins to get all users
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Only administrators can view all users';
    END IF;
    
    -- Return all users with email from auth.users
    RETURN QUERY
    SELECT 
        up.id,
        up.role,
        up.display_name,
        COALESCE(au.email::TEXT, '') as email,
        up.created_at,
        up.updated_at
    FROM public.user_profiles up
    LEFT JOIN auth.users au ON au.id = up.id
    ORDER BY up.created_at DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

