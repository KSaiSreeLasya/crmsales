# SalesHub CRM - Setup and Integration Guide

## Overview

SalesHub is a modern CRM application designed for sales teams to manage leads, assign them to salespersons, and track conversions. The app integrates with Google Sheets for automatic lead syncing and Supabase for data storage.

## Features

- ✅ Dashboard with key metrics and insights
- ✅ Leads management with filtering and search
- ✅ Team member management with performance tracking
- ✅ Google Sheets integration for automatic lead import
- ✅ Real-time data updates via Supabase
- ✅ Modern, responsive UI with Tailwind CSS

## Prerequisites

Before you start, you need:
1. A Supabase project
2. A Google Sheet with your leads data
3. Environment variables configured

## Step 1: Set Up Supabase

### Connect Supabase MCP

1. Click [Open MCP popover](#open-mcp-popover)
2. Find and connect to **Supabase**
3. Follow the prompts to authenticate and select your project

### Create Database Tables

Once Supabase is connected, create the following tables:

#### Table: `leads`
```sql
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  company TEXT NOT NULL,
  status TEXT CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  assigned_to TEXT,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `salespersons`
```sql
CREATE TABLE salespersons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `lead_assignments`
```sql
CREATE TABLE lead_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  salesperson_id UUID REFERENCES salespersons(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  status TEXT CHECK (status IN ('active', 'completed', 'transferred')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Set Environment Variables

Add these environment variables to your `.env` file:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project settings:
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL and anon/public key

## Step 2: Set Up Google Sheets Integration

### Prepare Your Google Sheet

Create a Google Sheet with the following columns (in the first row):
- `Name` - Lead's full name
- `Email` - Lead's email address
- `Phone` - Lead's phone number
- `Company` - Company name
- `Status` - (Optional) One of: new, contacted, qualified, converted, lost

Example:
```
Name          | Email              | Phone         | Company        | Status
John Smith    | john@example.com   | +1-234-567890 | Tech Corp      | new
Jane Doe      | jane@example.com   | +1-234-567891 | Business Inc   | contacted
```

### Share the Sheet

Make sure the sheet is publicly accessible:
1. Click "Share" on your Google Sheet
2. Set the access to "Anyone with the link can view"
3. Copy the share link

### Connect in Settings

1. Go to Settings > Integrations in the CRM
2. Paste your Google Sheet URL
3. Click "Connect Sheet"

The system will automatically sync new leads from the sheet every hour.

## Step 3: Configure the Application

### Add Your Team Members

1. Navigate to "Team Members" page
2. Click "Add Salesperson"
3. Enter their details (name, email, phone)
4. They'll be available for lead assignment

### Customize Settings

1. Go to Settings > General
2. Update your organization name and timezone
3. Save the changes

## Usage

### Adding Leads

#### Manual Entry
1. Go to "Leads" page
2. Click "Add Lead"
3. Fill in the lead details
4. Click "Add Lead"

#### From Google Sheet
1. Ensure your Google Sheet is connected in Settings
2. Leads will sync automatically
3. New leads will appear in the "Leads" page

### Assigning Leads

1. Go to "Leads" page
2. Find the lead you want to assign
3. Click the "Assign" dropdown in the "Assigned To" column
4. Select a salesperson
5. The lead is now assigned

### Tracking Progress

1. View the Dashboard for overall metrics
2. Check each lead's status (New, Contacted, Qualified, Converted, Lost)
3. Update status as leads progress through your sales pipeline
4. Monitor team performance on the "Team Members" page

## Real-Time Updates

The application uses Supabase's real-time capabilities to automatically update data:
- When a lead is added from Google Sheets, it appears instantly
- When a team member updates a lead's status, others see it immediately
- Team performance metrics update in real-time

## Troubleshooting

### Google Sheet Not Syncing
- Ensure the sheet is shared publicly ("Anyone with the link can view")
- Check that column headers match exactly (Name, Email, Phone, Company)
- Verify the share link format is correct

### Leads Not Appearing
- Check that Supabase environment variables are correctly set
- Verify the Supabase tables are created with correct schema
- Check browser console for any error messages

### Performance Issues
- The app caches data for 5 minutes to improve performance
- Real-time updates override cached data
- Clear browser cache if you see stale data

## API Routes

### Sync Leads from Google Sheet
```bash
POST /api/sync-leads
Content-Type: application/json

{
  "leads": [
    {
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+1-234-567890",
      "company": "Tech Corp",
      "status": "new"
    }
  ],
  "source": "google_sheet"
}
```

Response:
```json
{
  "success": true,
  "message": "X leads synced successfully",
  "synced": 5,
  "source": "google_sheet"
}
```

## Development

### Run Development Server
```bash
pnpm dev
```

### Build for Production
```bash
pnpm build
```

### Run Tests
```bash
pnpm test
```

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase real-time subscriptions
- **UI Framework**: Radix UI + Tailwind CSS

## Key Files

- `client/pages/Index.tsx` - Dashboard page
- `client/pages/Leads.tsx` - Leads management
- `client/pages/Salespersons.tsx` - Team management
- `client/pages/Settings.tsx` - Integration settings
- `client/lib/supabase.ts` - Supabase client and helpers
- `client/lib/googleSheets.ts` - Google Sheets utilities
- `server/routes/sync-leads.ts` - Lead sync API endpoint

## Next Steps

1. ✅ Set up Supabase
2. ✅ Create database tables
3. ✅ Configure environment variables
4. ✅ Set up Google Sheets
5. ✅ Add your team members
6. ✅ Start managing leads!

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review the browser console for error messages
3. Verify all environment variables are set correctly
4. Ensure Supabase tables are created with correct schema

---

Happy selling! 🚀
