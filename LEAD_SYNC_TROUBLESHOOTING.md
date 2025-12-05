# Lead Sync Troubleshooting Guide

## Problem

Leads are not syncing from Google Sheets with error: "Failed to sync leads" (500 error)

## Root Cause

The Supabase `leads` table is missing 4 columns that the sync endpoint tries to insert:

- `electricity_bill`
- `type_of_property`
- `avg_monthly_bill`
- `sheet_id`

## Solution

### Step 1: Run the Migration SQL on Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the SQL below:

```sql
-- Add missing columns to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS electricity_bill TEXT;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS type_of_property TEXT;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS avg_monthly_bill TEXT;

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS sheet_id TEXT DEFAULT '0';
```

5. Click **Run** to execute the migration
6. You should see success messages for each column added

### Step 2: Verify the Changes

Run this query to verify the columns were added:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;
```

You should see these new columns in the output:

- `electricity_bill` (text, nullable)
- `type_of_property` (text, nullable)
- `avg_monthly_bill` (text, nullable)
- `sheet_id` (text, not nullable, default '0')

### Step 3: Test the Sync

1. Go back to the Leads page in your application
2. Click the **Sync** button to sync leads from Google Sheets
3. You should now see the leads being imported successfully
4. Check the browser console for any remaining errors

## Common Error Messages

### Error: "Column does not exist" (Code: 42703)

- **Cause**: The migration SQL wasn't run
- **Solution**: Follow Step 1 above to run the migration

### Error: "Table 'leads' does not exist" (Code: 42P01)

- **Cause**: The leads table wasn't created
- **Solution**: Run the full `SUPABASE_TABLES.sql` script in your Supabase SQL Editor

### Error: "Unique violation on column email" (Code: 23505)

- **Cause**: You're trying to sync the same leads twice
- **Solution**: This is expected on subsequent syncs - the code will update existing leads instead of creating duplicates

## Additional Notes

### About the `sheet_id` Column

- Stores which Google Sheet a lead came from
- Allows you to sync multiple sheets and keep track of the source
- Default value is '0' for the main sheet

### About `electricity_bill`, `type_of_property`, and `avg_monthly_bill`

- These store customer information from the Google Sheet
- They're optional fields (nullable)
- Used for solar business lead qualification

### If Sync Still Fails

Check the browser console for detailed error messages:

1. Open your browser's Developer Tools (F12 or Right-click > Inspect)
2. Go to the Console tab
3. Look for error messages starting with `[SYNC ERROR]`
4. These will show:
   - The exact SQL error code
   - Column or table names with issues
   - Specific PostgreSQL error hints

### RLS (Row Level Security) Issues

If you see "RLS policy blocking INSERT":

1. Go to Supabase Dashboard > **Authentication > Policies**
2. Make sure the `anon` role has INSERT permission on the `leads` table
3. Or temporarily disable RLS for testing:
   ```sql
   ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
   ```

## Need More Help?

If the sync still isn't working after running the migration:

1. **Test Supabase Connection**: Visit `/api/test-supabase` in your app to verify connection
2. **Check Logs**: Look at the server logs to see detailed error messages
3. **Verify Credentials**: Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables are set correctly
4. **Check RLS Policies**: Make sure row-level security isn't blocking inserts

## Files Changed

- `SUPABASE_TABLES.sql` - Updated with new columns
- `SUPABASE_MIGRATION_ADD_COLUMNS.sql` - Migration script for existing tables
- `server/routes/sync-leads-dynamic.ts` - Improved error messages
