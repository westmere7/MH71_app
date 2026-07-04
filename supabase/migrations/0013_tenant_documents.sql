-- Migration 0013: Add documents column to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS documents text[] DEFAULT '{}'::text[];
