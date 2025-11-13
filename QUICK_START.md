# SalesHub CRM - Quick Start (After Fixes)

## ✅ Issues Fixed

### 1. Salesperson Form - Department & Region Removed

- ✅ Removed Department and Region fields from the "Add Salesperson" form
- ✅ Form now only requires: Name, Email, Phone
- ✅ Table columns updated to show only: Name, Email, Phone, Actions

### 2. Auto-Sync Google Sheets

- ✅ Leads now **automatically sync from Google Sheets on page load**
- ✅ Silent sync (no notification) on page load
- ✅ Manual sync shows success/error notification when you click "Sync Sheet" button

### 3. Google Sheets Column Flexibility

- ✅ Parser now handles flexible column names:
  - "Name" or "Full Name"
  - "Email"
  - "Phone"
  - "Company" (or will default to "N/A" if missing)
  - "Assigned to", "Assigned To", or "Owner"
  - "Status"
  - "Note 1", "Note1", "Note 2", or "Note2"

### 4. Better Error Messages

- ✅ Clear error message if Supabase tables aren't created: "Database not set up. Please run SUPABASE_TABLES.sql first"
- ✅ No error notifications during auto-sync on page load

---

## 🚀 How to Get It Working Now

### Step 1: Create Supabase Tables

Go to **Supabase Dashboard** → Your Project → **SQL Editor**

**Copy and paste this SQL, then click Run:**

```sql
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

-- Create indices
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indices for salespersons
CREATE INDEX IF NOT EXISTS salespersons_name_idx ON salespersons(name);
CREATE INDEX IF NOT EXISTS salespersons_email_idx ON salespersons(email);

-- Disable RLS for development
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE salespersons DISABLE ROW LEVEL SECURITY;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
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
```

### Step 2: Test Locally

1. **Refresh the browser**
2. Go to **Sales Team** page
3. Click **"Add Salesperson"**
4. Fill in Name, Email, Phone (only 3 fields now)
5. Click **"Add Salesperson"**
6. Should see success message ✅

### Step 3: Sync Leads from Google Sheets

Your Google Sheet: https://docs.google.com/spreadsheets/d/1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM/edit

1. Go to **Leads** page
2. Leads should **automatically sync from Google Sheets** (in background, no message)
3. You'll see all leads in the table
4. (Optional) Click **"Sync Sheet"** button to manually refresh

---

## 🔍 Troubleshooting

### "Failed to save salesperson"

**Solution**: Run the SQL above to create the salespersons table

### "No leads showing"

**Solution**:

1. Make sure Google Sheet is **publicly shared** ("Anyone with the link can view")
2. Check that sheet has these columns:
   - Name (or Full Name)
   - Email
   - Phone
   - Any other columns are optional

### "Database not set up" message

**Solution**: Run the SQL script from Step 1 above

---

## 📋 Google Sheet Column Names (Flexible)

Your sheet can have these column names (case-insensitive, spacing flexible):

**Required:**

- Name, Full Name, or FULL NAME
- Email
- Phone

**Optional (will be used if found):**

- Company
- Street Address or STREET ADDRESS
- Post Code or POST CODE
- Lead Status or LEAD STATUS
- Status
- Assigned To, Assigned to, or Owner
- Note 1, Note1, NOTE 1, or NOTE 1
- Note 2, Note2, NOTE 2, or NOTE 2

---

## 📊 What Happens Now

1. **Page Load** → Automatically syncs Google Sheets (silent)
2. **View Leads** → All synced leads appear in the table
3. **Click "Sync Sheet"** → Manual refresh with success/error message
4. **Add Salesperson** → Quick form with 3 fields only
5. **Dashboard** → Real metrics from database

---

## ✅ Checklist

- [ ] Supabase tables created (SQL run successfully)
- [ ] Browser refreshed
- [ ] Added a test salesperson
- [ ] Leads synced from Google Sheets
- [ ] Dashboard shows correct metrics

---

## 🎯 Next: Deploy to Render

When ready, follow `RENDER_DEPLOYMENT.md` to deploy live!

**All fixed and ready to go!** 🚀
