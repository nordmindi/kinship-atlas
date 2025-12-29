#!/bin/bash
# Initialize Supabase Auth Schema
# This script ensures the auth schema exists before starting GoTrue

echo "Checking if auth schema exists..."

docker exec kinship-atlas-db psql -U postgres -d postgres -c "
DO \$\$
BEGIN
    -- Create auth schema if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        CREATE SCHEMA auth;
        RAISE NOTICE 'Created auth schema';
    ELSE
        RAISE NOTICE 'Auth schema already exists';
    END IF;
END \$\$;
"

echo "Auth schema check complete."

