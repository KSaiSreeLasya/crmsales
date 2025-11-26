# Activity Log Setup Guide

This guide explains how to set up the Activity Log feature for lead tracking in your Supabase database.

## Overview

The Lead Details Modal includes three new features:

1. **Activity Log**: Tracks all status changes and note updates
2. **Activity Notes**: Allows adding timestamped notes to leads
3. **Enhanced Status Management**: Easy button-based status changes with history

## Database Tables Required

You need to create two tables in your Supabase database:

### 1. `activity_logs` Table

This table tracks all changes made to leads.

**SQL:**

```sql
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by TEXT,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_logs_lead_id ON activity_logs(lead_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
```

**Columns:**

- `id`: Unique identifier (UUID)
- `lead_id`: Reference to the lead being modified
- `action`: Type of action (e.g., "status_change", "note1_updated", "note2_updated")
- `old_value`: Previous value (for status changes)
- `new_value`: New value (for status changes or updates)
- `created_at`: Timestamp of the change (automatically set, displayed in IST)
- `created_by`: Optional field for tracking which user made the change

### 2. `activity_notes` Table

This table stores timestamped notes added through the Lead Details modal.

**SQL:**

```sql
CREATE TABLE activity_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by TEXT,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_notes_lead_id ON activity_notes(lead_id);
CREATE INDEX idx_activity_notes_created_at ON activity_notes(created_at DESC);
```

**Columns:**

- `id`: Unique identifier (UUID)
- `lead_id`: Reference to the lead
- `content`: The note text
- `created_at`: Timestamp of the note (automatically set, displayed in IST)
- `created_by`: Optional field for tracking which user created the note

## How to Create Tables

### Option 1: Using Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the SQL commands above
5. Execute the queries

### Option 2: Using Supabase Dashboard

1. Go to **Tables** section
2. Click **Create table**
3. For `activity_logs`:
   - Table name: `activity_logs`
   - Add columns:
     - `id` (UUID, Primary Key, Default: gen_random_uuid())
     - `lead_id` (UUID, Foreign Key to leads.id)
     - `action` (Text)
     - `old_value` (Text, Nullable)
     - `new_value` (Text, Nullable)
     - `created_at` (Timestamp, Default: now())
     - `created_by` (Text, Nullable)

4. Repeat for `activity_notes` with appropriate columns

## How It Works

### Activity Log Feature

- Every time a lead's status is changed through the Status tab, an entry is created in `activity_logs`
- Every time Note 1 or Note 2 is updated in the Overview tab, an entry is created
- All changes are logged with the old and new values

### Activity Notes Feature

- Users can add timestamped notes in the "Notes" tab
- Notes are stored separately from the main lead notes (note1 and note2)
- Each note displays the creation date/time in **IST (Indian Standard Time)**

### Date/Time Format

All timestamps are displayed in IST (Asia/Kolkata timezone) format:

- Example: `15 Jan 2024, 03:45:30 PM IST`

## Graceful Degradation

If the tables don't exist:

- The app will still work normally
- Activity Log and Activity Notes tabs will show "No activity recorded yet" or "No notes yet"
- The warning messages will appear in browser console but won't break the application
- Users can still add and edit leads normally

## Optional: Enable RLS (Row Level Security)

For added security, enable RLS on these tables:

```sql
-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_notes ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all authenticated users to read and insert)
CREATE POLICY "Allow authenticated users to read activity_logs"
ON activity_logs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert activity_logs"
ON activity_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Similar for activity_notes
CREATE POLICY "Allow authenticated users to read activity_notes"
ON activity_notes FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert activity_notes"
ON activity_notes FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

## Testing

1. Log in to the CRM
2. Navigate to **Leads** page
3. Click on any lead row to open the Lead Details modal
4. Try the following:
   - **Overview tab**: Edit Note 1 or Note 2, changes should be auto-saved
   - **Notes tab**: Add a new note with date/time in IST
   - **Activity tab**: See all changes logged (if tables exist)
   - **Status tab**: Change the lead status using buttons
   - Check the Activity tab to see the status change logged

## Troubleshooting

### "Activity logs not available" message

- This means the `activity_logs` table doesn't exist yet
- Create the table using the SQL provided above

### "Activity notes not available" message

- This means the `activity_notes` table doesn't exist yet
- Create the table using the SQL provided above

### Date/Time not in IST format

- Clear your browser cache and refresh
- The formatting is done client-side using JavaScript's `Intl.DateTimeFormat`

### Notes not saving

- Check browser console for error messages
- Ensure you have write permissions to the `activity_notes` table
- Verify the table exists in Supabase
