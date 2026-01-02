-- Family Groups Migration
-- This migration creates the family groups system for organizing family members
-- into groups like "Mother's Side", "Father's Side", "In-Laws", etc.
-- Created: 2025-01-25

-- Create family_groups table
CREATE TABLE IF NOT EXISTS public.family_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create family_member_groups table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.family_member_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE NOT NULL,
    family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_member_id, family_group_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_groups_user_id ON public.family_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_family_groups_name ON public.family_groups(name);
CREATE INDEX IF NOT EXISTS idx_family_member_groups_member ON public.family_member_groups(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_member_groups_group ON public.family_member_groups(family_group_id);

-- Enable Row Level Security (RLS) on both tables
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_member_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for family_groups
CREATE POLICY "Users can view all family groups" ON public.family_groups
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own family groups" ON public.family_groups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own family groups" ON public.family_groups
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own family groups" ON public.family_groups
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for family_member_groups
CREATE POLICY "Users can view all family member groups" ON public.family_member_groups
    FOR SELECT USING (true);

CREATE POLICY "Users can insert family member groups for their members" ON public.family_member_groups
    FOR INSERT WITH CHECK (
        -- User must own the group
        EXISTS (
            SELECT 1 FROM public.family_groups 
            WHERE id = family_group_id AND user_id = auth.uid()
        ) AND
        -- Member must either belong to user OR have no owner (null user_id and created_by)
        -- This allows assigning orphaned members to groups
        EXISTS (
            SELECT 1 FROM public.family_members 
            WHERE id = family_member_id 
            AND (
                user_id = auth.uid() 
                OR created_by = auth.uid()
                OR (user_id IS NULL AND created_by IS NULL)
            )
        )
    );

CREATE POLICY "Users can delete family member groups for their members" ON public.family_member_groups
    FOR DELETE USING (
        -- User must own the group
        EXISTS (
            SELECT 1 FROM public.family_groups 
            WHERE id = family_group_id AND user_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_family_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_family_groups_updated_at
    BEFORE UPDATE ON public.family_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_family_groups_updated_at();

