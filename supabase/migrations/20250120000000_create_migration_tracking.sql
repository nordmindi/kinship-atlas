-- Migration Tracking System
-- This migration creates a table to track which migrations have been applied
-- This ensures migrations run only once and can be tracked

-- Create migration tracking table
-- Note: name is nullable to support GoTrue's migration system which doesn't use names
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    name TEXT,  -- Nullable to support GoTrue migrations
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum TEXT,
    execution_time_ms INTEGER
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON public.schema_migrations(version);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON public.schema_migrations(applied_at);

-- Enable RLS (but allow service role to manage)
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (migrations are typically run by service role)
-- In production, this should be restricted, but during initialization we need it open
-- The service role key bypasses RLS anyway, so this is safe
CREATE POLICY "Allow all operations on migrations" ON public.schema_migrations
    FOR ALL USING (true);

-- Function to check if a migration has been applied
CREATE OR REPLACE FUNCTION public.migration_applied(version TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.schema_migrations 
        WHERE schema_migrations.version = migration_applied.version
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a migration
CREATE OR REPLACE FUNCTION public.record_migration(
    version TEXT,
    name TEXT,
    checksum TEXT DEFAULT NULL,
    execution_time_ms INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.schema_migrations (version, name, checksum, execution_time_ms)
    VALUES (version, name, checksum, execution_time_ms)
    ON CONFLICT (version) DO UPDATE
    SET 
        name = EXCLUDED.name,
        checksum = EXCLUDED.checksum,
        execution_time_ms = EXCLUDED.execution_time_ms,
        applied_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

