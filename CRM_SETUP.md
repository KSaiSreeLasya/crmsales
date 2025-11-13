# SalesHub CRM - Setup and Integration Guide

## Overview

SalesHub is a modern CRM application designed for sales teams to manage leads, assign them to salespersons, and track conversions. The app integrates with Google Sheets for automatic lead and salesperson syncing, and Supabase for data storage.

## Features

- ✅ Dashboard with key metrics and insights
- ✅ Leads management with filtering, search, and CRUD operations
- ✅ Salespersons management with full CRUD operations
- ✅ Google Sheets integration for automatic lead and salesperson import
- ✅ Real-time data updates via Supabase
- ✅ Modern, responsive UI with Tailwind CSS

## Prerequisites

Before you start, you need:
1. A Supabase project
2. Google Sheets with your leads and salespersons data
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
  status TEXT CHECK (status IN ('Not lifted', 'Not connected', 'Voice Message', 'Quotation sent', 'Site visit', 'Advance payment', 'Lead finished', 'Contacted')) DEFAULT 'Not lifted',
  assigned_to TEXT NOT NULL,
  note1 TEXT,
  note2 TEXT,
  source TEXT,
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
  department TEXT NOT NULL,
  region TEXT NOT NULL,
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

## Step 2: Prepare Google Sheets

### Leads Sheet

Create a Google Sheet named "Leads" with these columns (in order):
- **Name** - Lead's full name
- **Email** - Lead's email address
- **Company** - Company name
- **Phone** - Lead's phone number
- **Assigned to** - Salesperson assigned to this lead
- **Status** - One of: Not lifted, Not connected, Voice Message, Quotation sent, Site visit, Advance payment, Lead finished, Contacted
- **Note1** - First note/comment
- **Note2** - Second note/comment

Example:
```
Name       | Email              | Company      | Phone         | Assigned to    | Status           | Note1          | Note2
John Smith | john@example.com   | Tech Corp    | +1-234-567890 | Sarah Johnson  | Contacted        | Interested     | Follow up
Jane Doe   | jane@example.com   | Business Inc | +1-234-567891 | Mike Chen      | Quotation sent   | High interest  | Waiting
```

**Important:** Only rows with values in the Name field will be imported. Empty rows are automatically skipped.

### Salespersons Sheet

Create a Google Sheet named "Salespersons" with these columns (in order):
- **Name** - Salesperson's full name
- **Email** - Salesperson's email address
- **Phone** - Salesperson's phone number
- **Department** - Department (e.g., Sales, Sales Manager)
- **Region** - Region assigned (e.g., North, South, East, West)

Example:
```
Name            | Email              | Phone         | Department    | Region
Sarah Johnson   | sarah@example.com  | +1-234-567890 | Sales         | North
Mike Chen       | mike@example.com   | +1-234-567891 | Sales         | South
```

**Important:** Only rows with values in the Name field will be imported. Empty rows are automatically skipped.

### Make Sheets Public

Make sure both sheets are publicly accessible:
1. Click "Share" on your Google Sheet
2. Set the access to "Anyone with the link can view"
3. Copy the share link

## Step 3: Configure the Application

### Add Salespersons

You can:
1. **Manually add via UI**: Go to "Sales Team" page and click "Add Salesperson"
2. **Sync from Google Sheet**: Go to Settings and connect your Salespersons sheet

### Import Leads

You can:
1. **Manually add via UI**: Go to "Leads" page and click "Add Lead"
2. **Sync from Google Sheet**: Go to Settings and connect your Leads sheet

### Configure Settings

1. Go to Settings > Integrations
2. Paste your Google Sheet URL for Leads
3. Click "Connect Sheet"
4. Leads will sync automatically

## Usage

### Managing Leads

#### Add Lead
1. Go to "Leads" page
2. Click "Add Lead"
3. Fill in all required fields (Name, Email, Company, Phone, Assigned To)
4. Optionally add Status and Notes
5. Click "Add Lead"

#### Edit Lead
1. Go to "Leads" page
2. Click the Edit icon for the lead
3. Update any fields
4. Click "Update Lead"

#### Delete Lead
1. Go to "Leads" page
2. Click the Delete icon
3. Confirm deletion

#### Filter & Search
- Use the search box to find leads by name, email, or company
- Use the Status dropdown to filter by lead status

### Managing Salespersons

#### Add Salesperson
1. Go to "Sales Team" page
2. Click "Add Salesperson"
3. Fill in all fields (Name, Email, Phone, Department, Region)
4. Click "Add Salesperson"

#### Edit Salesperson
1. Go to "Sales Team" page
2. Click the Edit icon
3. Update any fields
4. Click "Update Salesperson"

#### Delete Salesperson
1. Go to "Sales Team" page
2. Click the Delete icon
3. Confirm deletion

### Syncing from Google Sheets

#### Sync Leads
1. Prepare your Google Sheet with the leads columns
2. Make it publicly shareable
3. Go to Settings > Integrations
4. Paste the sheet URL
5. Click "Connect Sheet"

#### Sync Salespersons
1. Prepare your Google Sheet with the salespersons columns
2. Make it publicly shareable
3. Go to Settings > Integrations
4. Paste the sheet URL for salespersons
5. Click "Connect Sheet"

## Status Options

The following status options are available for leads:
- **Not lifted** - Initial status, no contact attempted
- **Not connected** - Contact attempted but no connection
- **Voice Message** - Left voicemail
- **Contacted** - Successfully contacted
- **Quotation sent** - Quote/proposal sent
- **Site visit** - Site visit scheduled/completed
- **Advance payment** - Advance payment received
- **Lead finished** - Deal closed or deal lost

## Real-Time Updates

The application uses Supabase's real-time capabilities to automatically update data:
- When a lead is added from Google Sheets, it appears instantly
- When a team member updates lead info, others see it immediately
- Team changes sync across all users in real-time

## Troubleshooting

### Google Sheet Not Syncing
- Ensure the sheet is shared publicly ("Anyone with the link can view")
- Check that column headers match exactly (Name, Email, Phone, etc.)
- Verify the share link format is correct
- Ensure rows have values in required columns (Name for both sheets)

### Empty Rows Issue
- The system automatically skips empty rows
- Only rows with a Name value are imported
- Make sure your Google Sheet doesn't have blank rows between data

### Leads Not Appearing
- Check that Supabase environment variables are correctly set
- Verify the Supabase tables are created with correct schema
- Check browser console for any error messages

### Sync Errors
- Verify the spreadsheet is publicly accessible
- Check that all required columns exist with correct names
- Ensure data format matches expected format (emails should be valid, etc.)

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
      "status": "Contacted",
      "assignedTo": "Sarah Johnson",
      "note1": "Interested",
      "note2": "Follow up"
    }
  ],
  "source": "google_sheet"
}
```

### Sync Salespersons from Google Sheet
```bash
POST /api/sync-salespersons
Content-Type: application/json

{
  "salespersons": [
    {
      "name": "Sarah Johnson",
      "email": "sarah@example.com",
      "phone": "+1-234-567890",
      "department": "Sales",
      "region": "North"
    }
  ],
  "source": "google_sheet"
}
```

## Database Schema

### Leads Table
- `id` (UUID, Primary Key)
- `name` (TEXT, Required)
- `email` (TEXT, Unique, Required)
- `phone` (TEXT, Required)
- `company` (TEXT, Required)
- `status` (TEXT, Default: 'Not lifted')
- `assigned_to` (TEXT, Required)
- `note1` (TEXT)
- `note2` (TEXT)
- `source` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Salespersons Table
- `id` (UUID, Primary Key)
- `name` (TEXT, Required)
- `email` (TEXT, Unique, Required)
- `phone` (TEXT, Required)
- `department` (TEXT, Required)
- `region` (TEXT, Required)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

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
- `client/pages/Leads.tsx` - Leads management (CRUD)
- `client/pages/Salespersons.tsx` - Salespersons management (CRUD)
- `client/pages/Settings.tsx` - Integration settings
- `client/lib/supabase.ts` - Supabase client and helpers
- `client/lib/googleSheets.ts` - Google Sheets utilities
- `server/routes/sync-leads.ts` - Lead sync API endpoint
- `server/routes/sync-salespersons.ts` - Salesperson sync API endpoint

## Next Steps

1. ✅ Set up Supabase
2. ✅ Create database tables
3. ✅ Configure environment variables
4. ✅ Prepare Google Sheets
5. ✅ Add your salespersons
6. ✅ Import leads
7. ✅ Start managing your sales pipeline!

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Review the browser console for error messages
3. Verify all environment variables are set correctly
4. Ensure Supabase tables are created with correct schema
5. Confirm Google Sheets are publicly accessible

---

Happy selling! 🚀
