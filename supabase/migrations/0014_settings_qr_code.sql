-- Migration 0014: Add qr_code_url column to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS qr_code_url text;
