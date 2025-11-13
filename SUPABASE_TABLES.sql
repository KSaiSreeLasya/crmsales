-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  company TEXT NOT NULL,
  street_address TEXT,
  post_code TEXT,
  lead_status TEXT,
  status TEXT CHECK (status IN ('New', 'Not lifted', 'Not connected', 'Voice Message', 'Quotation sent', 'Site visit', 'Advance payment', 'Lead finished', 'Contacted')) DEFAULT 'New',
  assigned_to TEXT DEFAULT 'Unassigned',
  note1 TEXT,
  note2 TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);

-- Create salespersons table
CREATE TABLE IF NOT EXISTS salespersons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  department TEXT,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indices for salespersons
CREATE INDEX IF NOT EXISTS salespersons_name_idx ON salespersons(name);
CREATE INDEX IF NOT EXISTS salespersons_email_idx ON salespersons(email);

-- Enable Row Level Security (disable for development, enable for production)
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE salespersons DISABLE ROW LEVEL SECURITY;

-- Grant permissions (if RLS is enabled, uncomment these)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO anon;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON salespersons TO anon;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_salespersons_updated_at ON salespersons;
CREATE TRIGGER update_salespersons_updated_at
BEFORE UPDATE ON salespersons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
