#!/bin/bash
# Fix GoTrue migration issue for existing databases
# This script can be run manually if the database already exists

echo "Fixing GoTrue migration issue..."

docker exec kinship-atlas-db psql -U postgres -d postgres <<EOF
-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth.schema_migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version VARCHAR(255) PRIMARY KEY
);

-- Mark the problematic migration as applied
INSERT INTO auth.schema_migrations (version)
VALUES ('20221208132122')
ON CONFLICT (version) DO NOTHING;

SELECT 'Migration 20221208132122 marked as applied' AS status;
EOF

echo "Fix applied. You may need to restart the GoTrue container:"
echo "  docker restart kinship-atlas-api"

