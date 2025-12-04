-- Migration: Add missing columns to leads table
-- This migration adds the sheet_id and other columns that were missing from the schema
-- Run this in Supabase SQL Editor if the columns don't exist

-- Add sheet_id column if it doesn't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sheet_id TEXT DEFAULT '0';

-- Add electricity-related columns if they don't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS electricity_bill TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS type_of_property TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS avg_monthly_bill TEXT;

-- Create index on sheet_id for better query performance
CREATE INDEX IF NOT EXISTS leads_sheet_id_idx ON leads(sheet_id);

-- Verify the columns were added
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'leads' 
-- ORDER BY ordinal_position;
