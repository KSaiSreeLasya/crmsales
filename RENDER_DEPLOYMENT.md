# SalesHub CRM - Render Deployment Guide

This guide will help you deploy the SalesHub CRM application to Render with Supabase database integration.

---

## Prerequisites

Before starting, ensure you have:

1. ✅ **Supabase Project**: Created and configured with database tables
2. ✅ **GitHub Repository**: Code pushed to GitHub with your changes
3. ✅ **Render Account**: Free account at [render.com](https://render.com)
4. ✅ **Supabase Credentials**:
   - Project URL: `https://[YOUR_PROJECT].supabase.co`
   - Anon Key: From Supabase dashboard > Settings > API
5. ✅ **Google Sheets**: Public Google Sheet with leads data (for syncing)

---

## Step 1: Set Up Supabase Database Tables

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** > **New Query**
4. Copy the entire content from `SUPABASE_TABLES.sql` file
5. Paste it into the SQL editor
6. Click **Run**
7. Verify tables were created successfully

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref [YOUR_PROJECT_REF]

# Run migrations
supabase migration list
```

---

## Step 2: Verify Supabase Configuration

1. Go to **Supabase Dashboard > Settings > API**
2. Copy your **Project URL** and **Anon Key**
3. Verify you have:
   - ✅ `leads` table with all columns
   - ✅ `salespersons` table with all columns
   - ✅ Indices created for performance
   - ✅ Row Level Security disabled (for development)

---

## Step 3: Prepare Your GitHub Repository

### Push Code to GitHub

```bash
# Ensure all changes are committed
git add .
git commit -m "Ready for Render deployment - Supabase integration complete"

# Push to main branch
git push origin main
```

### Verify Repository Structure

Ensure your repository has:

```
/
├── client/                    # Frontend React code
├��─ server/                    # Backend Express server
├── public/                    # Static files
├── package.json              # Dependencies
├── pnpm-lock.yaml           # Lock file
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite config
├── tailwind.config.ts       # Tailwind config
├── SUPABASE_SETUP.md        # Supabase setup
├── SUPABASE_TABLES.sql      # SQL tables
└── RENDER_DEPLOYMENT.md     # This file
```

---

## Step 4: Create Render Web Service

### 4.1 Connect GitHub to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** > **Web Service**
3. Click **Connect a repository**
4. Authorize Render to access your GitHub account
5. Select your repository
6. Click **Connect**

### 4.2 Configure Service

Fill in the following details:

**Basic Settings:**
- **Name**: `saleshub-crm` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your location
- **Branch**: `main`

**Build & Deploy:**
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `pnpm start`

**Environment Variables:**

Click **Add Environment Variable** for each:

| Key | Value | Example |
|-----|-------|---------|
| `VITE_SUPABASE_URL` | Your Supabase URL | `https://bapbepwybsznjhrgipbt.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | `eyJhbGc...` |
| `NODE_ENV` | `production` | `production` |

**Plan:**
- Select **Free Plan** or **Paid Plan** depending on your needs
- Free plan includes: 750 hours/month, auto-pause after 15 min inactivity

---

## Step 5: Deploy

1. Review all settings are correct
2. Click **Create Web Service**
3. Render will automatically:
   - Build your application
   - Deploy to production
   - Provide a public URL

**Build Status:**
- Watch the deploy logs in real-time
- Successful deployment shows: `Build successful`

**Your App URL:**
- Format: `https://saleshub-crm.onrender.com`
- May take 2-5 minutes to become available

---

## Step 6: Verify Deployment

### Test Your Application

1. Open your Render URL: `https://saleshub-crm.onrender.com`
2. Navigate to **Leads** page
3. Click **Sync Sheet** button
4. Verify leads are synced from Google Sheets to Supabase
5. Check dashboard shows updated metrics

### Common Issues

**Issue: "Failed to load leads"**
- ✅ Verify Supabase credentials in Render environment variables
- ✅ Check Supabase tables are created
- ✅ Ensure RLS is disabled (for development)

**Issue: "Cannot connect to database"**
- ✅ Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- ✅ Verify Supabase project is active
- ✅ Check Render logs for detailed errors

**Issue: "Google Sheet sync fails"**
- ✅ Verify Google Sheet is publicly shared
- ✅ Check spreadsheet ID is correct in code
- ✅ Ensure columns match expected format

**Issue: Application won't start**
- ✅ Check Node.js version: `node --version` (requires 18+)
- ✅ Review build logs in Render dashboard
- ✅ Verify `pnpm install` completes successfully

---

## Step 7: Post-Deployment Configuration

### Monitor Application

1. **View Logs**: In Render dashboard > Logs
2. **Monitor Performance**: Check resource usage
3. **Set Alerts**: Configure notifications for errors

### Backup Data

1. Go to Supabase Dashboard
2. Navigate to **Settings > Backups**
3. Enable automatic backups (if on paid plan)
4. Or manually export data using SQL

### Enable Auto-Redeploy

To automatically redeploy when you push to GitHub:

1. Go to Render service settings
2. Enable **Auto-Deploy** on push
3. Select branch: `main`

---

## Step 8: Production Best Practices

### Enable Row Level Security (RLS)

For production, enable RLS to secure data:

1. Go to Supabase SQL Editor
2. Run these commands:

```sql
-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE salespersons ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable read for all authenticated users"
ON leads
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for all authenticated users"
ON leads
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for all authenticated users"
ON leads
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for all authenticated users"
ON leads
FOR DELETE
USING (auth.role() = 'authenticated');
```

### Set Up Authentication

For additional security, implement Supabase authentication:

1. Go to Supabase Dashboard > Authentication
2. Configure sign-up/sign-in methods
3. Update client code to require login

### Use Service Role Key for Server

For backend operations (sync-leads, sync-salespersons):

1. Get Service Role Key from Supabase > Settings > API
2. Add to Render environment variables as `SUPABASE_SERVICE_ROLE_KEY`
3. Use for authenticated server operations

---

## Step 9: Continuous Deployment

### Auto-Deploy from GitHub

Your deployment is now configured to:

1. **Trigger**: When code is pushed to `main` branch
2. **Build**: Runs `pnpm install && pnpm build`
3. **Deploy**: Automatically deployed to production
4. **Notify**: Render sends deployment notifications

### Deploy Manually (if needed)

1. Go to Render Dashboard
2. Select your service
3. Click **Manual Deploy** > **Deploy latest commit**

---

## Step 10: Troubleshooting

### Check Application Logs

```bash
# View logs in Render dashboard
# Services > Your Service > Logs
```

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot find module 'express'` | Dependencies not installed | Check `package.json` and `pnpm-lock.yaml` |
| `VITE_SUPABASE_URL is undefined` | Missing env variable | Add to Render environment variables |
| `Failed to sync leads` | Google Sheet not accessible | Ensure sheet is publicly shared |
| `Port already in use` | Port conflict | Render uses port 3000 by default |
| `Build timeout` | Build takes too long | Check for large dependencies |

### View Deployment Metrics

1. Render Dashboard > Your Service
2. Check:
   - **CPU Usage**: Should be <50% during idle
   - **Memory**: Should be <500MB
   - **Disk**: Monitor disk space usage
   - **Network**: Check bandwidth usage

---

## Step 11: Scaling and Optimization

### For High Traffic

1. Upgrade from Free to Paid plan
2. Enable **Auto-Scaling**:
   - Render Dashboard > Service > Settings
   - Set min/max instances

### Database Optimization

1. Add more indices in Supabase
2. Implement query caching
3. Archive old leads

### Performance Monitoring

1. Use Supabase Analytics
2. Monitor API response times
3. Check database query performance

---

## Step 12: Backup and Recovery

### Automatic Backups

**Supabase Free Plan**: Manual backups only

**Supabase Paid Plans**:
1. Go to Settings > Backups
2. Configure backup frequency
3. Set retention policy

### Manual Backup

Export data using SQL:

```sql
-- Backup leads
SELECT * FROM leads;

-- Backup salespersons
SELECT * FROM salespersons;
```

Or use Supabase API to export data.

---

## Environment Variables Reference

### Required for Frontend

```env
VITE_SUPABASE_URL=https://[PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
```

### Optional for Backend

```env
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
GOOGLE_SHEETS_API_KEY=[IF_USING_AUTHENTICATED_SHEETS]
```

### Render Specific

```env
NODE_ENV=production
```

---

## Support and Resources

- **Render Docs**: https://render.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Vite Docs**: https://vitejs.dev
- **Express Docs**: https://expressjs.com

---

## Summary Checklist

- ✅ Supabase database tables created
- ✅ GitHub repository ready with code
- ✅ Render web service created
- ✅ Environment variables configured
- ✅ Deployment successful
- ✅ Application accessible at public URL
- ✅ Google Sheets sync working
- ✅ Dashboard metrics displaying correctly
- ✅ Logs monitored for errors
- ✅ Backups configured

---

## Next Steps After Deployment

1. **Share Public URL** with your team
2. **Configure Custom Domain** (if needed)
3. **Set Up Monitoring** and alerts
4. **Enable Analytics** for usage insights
5. **Implement Authentication** for security
6. **Schedule Regular Backups** for data safety
7. **Monitor Performance** metrics regularly
8. **Plan Scaling Strategy** for growth

---

Your SalesHub CRM is now live! 🚀

For questions or issues, check the troubleshooting section or review the logs in Render dashboard.
