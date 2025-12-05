-- Migration: Add missing columns to leads table
-- Run this if you already have a leads table but it's missing these columns

-- Add electricity_bill column if it doesn't exist
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS electricity_bill TEXT;

-- Add type_of_property column if it doesn't exist
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS type_of_property TEXT;

-- Add avg_monthly_bill column if it doesn't exist
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS avg_monthly_bill TEXT;

-- Add sheet_id column if it doesn't exist with default value
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS sheet_id TEXT DEFAULT '0';

-- Verify the columns were added
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads';
