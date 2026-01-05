-- Add user_tree_layouts table for persisting custom family tree layouts
-- This allows users to save their custom node positions across sessions

-- Create user_tree_layouts table
CREATE TABLE IF NOT EXISTS public.user_tree_layouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    node_positions JSONB NOT NULL DEFAULT '{}'::jsonb,
    viewport_state JSONB, -- Store zoom, pan, etc. for future use
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id) -- One layout per user
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tree_layouts_user_id ON public.user_tree_layouts(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_tree_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_tree_layouts_updated_at
    BEFORE UPDATE ON public.user_tree_layouts
    FOR EACH ROW
    EXECUTE FUNCTION update_user_tree_layouts_updated_at();

-- Enable RLS
ALTER TABLE public.user_tree_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own layout
CREATE POLICY "Users can view their own tree layout" ON public.user_tree_layouts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own layout
CREATE POLICY "Users can insert their own tree layout" ON public.user_tree_layouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own layout
CREATE POLICY "Users can update their own tree layout" ON public.user_tree_layouts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own layout
CREATE POLICY "Users can delete their own tree layout" ON public.user_tree_layouts
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all layouts (for support/debugging)
CREATE POLICY "Admins can view all tree layouts" ON public.user_tree_layouts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

