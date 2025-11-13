# SalesHub CRM - Supabase Setup & Deployment Guide

## Step 1: Connect Supabase to the Application

### 1.1 Connect Supabase MCP
- Click [Open MCP popover](#open-mcp-popover)
- Find and connect to **Supabase**
- Follow the prompts to authenticate and select your project
- Note down your **Project URL** and **Anon Key**

### 1.2 Set Environment Variables
Once Supabase is connected, set these environment variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project:
1. Go to your Supabase dashboard
2. Navigate to **Settings > API**
3. Copy the **Project URL** and **anon/public key**

---

## Step 2: Create Database Tables

### 2.1 Create "leads" Table

Go to Supabase SQL Editor and run:

```sql
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  street_address TEXT,
  post_code TEXT,
  lead_status TEXT,
  note1 TEXT,
  note2 TEXT,
  status TEXT CHECK (status IN ('New', 'Not lifted', 'Not connected', 'Voice Message', 'Quotation sent', 'Site visit', 'Advance payment', 'Lead finished', 'Contacted')) DEFAULT 'New',
  owner TEXT DEFAULT 'Unassigned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create index for faster queries
CREATE INDEX leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX leads_owner_idx ON leads(owner);
CREATE INDEX leads_status_idx ON leads(status);
```

### 2.2 Create "salespersons" Table

```sql
CREATE TABLE salespersons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create index for faster queries
CREATE INDEX salespersons_name_idx ON salespersons(name);
CREATE INDEX salespersons_email_idx ON salespersons(email);
```

### 2.3 Enable Row Level Security (RLS)

For development/testing, you can disable RLS or set it to allow all:

```sql
-- Disable RLS for development (NOT recommended for production)
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE salespersons DISABLE ROW LEVEL SECURITY;

-- Grant permissions (if RLS is enabled)
GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON salespersons TO anon;
```

---

## Step 3: Update Application Code

### 3.1 Update Leads Page to Use Supabase

The Leads page is already set up to sync from Google Sheets. To enable Supabase storage:

1. After syncing from Google Sheets, the data is stored in memory
2. To persist to Supabase, we'll add a save button or auto-save

### 3.2 Update Salespersons Page to Use Supabase

Similarly, the Salespersons page can fetch/store data from Supabase.

---

## Step 4: Database Access & Management

### 4.1 Query Data in Supabase
Go to **Supabase SQL Editor** to view your data:

```sql
-- View all leads
SELECT * FROM leads ORDER BY created_at DESC LIMIT 20;

-- View all salespersons
SELECT * FROM salespersons ORDER BY name;

-- Count leads by status
SELECT status, COUNT(*) as count FROM leads GROUP BY status;

-- Find unassigned leads
SELECT * FROM leads WHERE owner = 'Unassigned' ORDER BY created_at DESC;
```

### 4.2 Manage Data
- Use **Supabase Dashboard > Table Editor** to manually edit data
- Use **SQL Editor** for bulk operations
- Use **Realtime** to enable live updates

---

## Step 5: Deployment to Render

### 5.1 Prerequisites
- GitHub repository with your code
- Render account (free at render.com)
- Supabase project (already created)

### 5.2 Deploy to Render

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create a new service on Render**
   - Go to https://dashboard.render.com
   - Click "New +" > "Web Service"
   - Connect your GitHub repository
   - Select the branch to deploy (main)

3. **Configure environment variables on Render**
   - Add these environment variables in Render dashboard:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   NODE_ENV=production
   ```

4. **Build & Deploy Settings**
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Node Version**: 18 or higher

5. **Deploy**
   - Render will automatically build and deploy your app
   - Access your app at: `https://your-app-name.onrender.com`

### 5.3 Post-Deployment
After deployment, your app will:
- ✅ Automatically sync leads from Google Sheets on page load
- ✅ Store data locally in browser (for future Supabase integration)
- ✅ Allow manual sync with "Sync Sheet" button
- ✅ Support lead assignment and editing
- ✅ Support salesperson management

---

## Step 6: Data Persistence (Optional - For Full Supabase Integration)

To fully integrate Supabase for data persistence, update the API routes:

### 6.1 Update `/api/sync-leads` Route

File: `server/routes/sync-leads.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export const handleSyncLeads = async (req, res) => {
  try {
    const { leads } = req.body;

    // Insert leads into Supabase
    const { data, error } = await supabase
      .from("leads")
      .upsert(
        leads.map((lead) => ({
          full_name: lead.fullName,
          email: lead.email,
          phone: lead.phone,
          street_address: lead.streetAddress,
          post_code: lead.postCode,
          lead_status: lead.leadStatus,
          note1: lead.note1,
          note2: lead.note2,
          status: lead.status,
          owner: lead.owner,
        })),
        { onConflict: "email" }
      );

    if (error) throw error;

    res.json({
      success: true,
      message: `${leads.length} leads synced successfully`,
      synced: leads.length,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to sync leads",
      message: error.message,
    });
  }
};
```

### 6.2 Fetch Leads from Supabase

Frontend API call:

```typescript
async function fetchLeadsFromSupabase() {
  const response = await fetch("/api/leads");
  const data = await response.json();
  return data;
}
```

---

## Step 7: Troubleshooting

### Issue: "Connection refused" when deploying
- ✅ Check Supabase credentials are correct
- ✅ Ensure environment variables are set on Render
- ✅ Verify Supabase project is running

### Issue: "Column does not exist" error
- ✅ Run the table creation SQL again
- ✅ Check column names match (use snake_case in Supabase)
- ✅ Ensure migrations were applied

### Issue: Data not persisting after refresh
- ✅ Currently, data is stored locally in browser
- ✅ Implement Supabase API endpoints for persistence
- ✅ Use `useEffect` to fetch from Supabase on page load

### Issue: Render deployment failing
- ✅ Check build logs in Render dashboard
- ✅ Verify `pnpm install` works locally
- ✅ Check for any TypeScript errors: `pnpm typecheck`
- ✅ Ensure all environment variables are set

---

## Step 8: Monitoring & Maintenance

### 8.1 Monitor Supabase Usage
- Go to Supabase Dashboard > **Usage**
- Monitor database connections, storage, API calls
- Set up alerts for quota limits

### 8.2 Monitor Render Deployment
- Go to Render Dashboard > **Logs**
- Check for errors and performance issues
- Monitor CPU and memory usage

### 8.3 Backup Data
- Use Supabase **Backups** feature (paid plans)
- Manually export data using SQL queries
- Schedule regular backups

---

## Step 9: Database Diagram

```
┌─────────────────────────────┐
│         leads               │
├─────────────────────────────┤
│ id (UUID, PK)               │
│ full_name (TEXT)            │
│ email (TEXT)                │
│ phone (TEXT)                │
│ street_address (TEXT)       │
│ post_code (TEXT)            │
│ lead_status (TEXT)          │
│ note1 (TEXT)                │
│ note2 (TEXT)                │
│ status (TEXT)               │
│ owner (TEXT) -> FK          │
│ created_at (TIMESTAMP)      │
│ updated_at (TIMESTAMP)      │
└─────────────────────────────┘
          │
          ├── References
          │
┌─────────────────────────────┐
│    salespersons             │
├─────────────────────────────┤
│ id (UUID, PK)               │
│ name (TEXT, UNIQUE)         │
│ email (TEXT, UNIQUE)        │
│ phone (TEXT)                │
│ created_at (TIMESTAMP)      │
│ updated_at (TIMESTAMP)      │
└─────────────────────────────┘
```

---

## Summary

You now have:
1. ✅ Supabase project created
2. ✅ Database tables with proper schema
3. ✅ Environment variables configured
4. ✅ Application ready for deployment
5. ✅ Data syncing from Google Sheets
6. ✅ Persistent storage ready (optional Supabase integration)

**Next Steps:**
- Deploy to Render for production
- Monitor usage and performance
- Implement Supabase API endpoints for full persistence
- Add authentication if needed
- Set up automated backups

---

## Useful Resources

- **Supabase Docs**: https://supabase.com/docs
- **Render Docs**: https://render.com/docs
- **React Supabase Client**: https://supabase.com/docs/guides/realtime/use-supabase-realtime
- **Database Design**: https://supabase.com/docs/guides/database/database-design

---

For questions or issues, refer to the troubleshooting section or check the logs in your respective platform dashboards.
