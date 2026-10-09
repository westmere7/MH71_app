-- Add VietQR bank details to settings singleton
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS bank_id text DEFAULT 'BIDV',
  ADD COLUMN IF NOT EXISTS bank_account_no text DEFAULT '3130907350',
  ADD COLUMN IF NOT EXISTS bank_account_name text DEFAULT 'NGUYEN BAC KINH',
  ADD COLUMN IF NOT EXISTS vietqr_template text DEFAULT 'compact2';
