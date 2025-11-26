# Lead Details Modal Feature

## Overview

A comprehensive Lead Details modal has been implemented that allows users to view, edit, and track all information about a lead in one place. The modal features multiple tabs for easy navigation and management.

## Features Implemented

### 1. **Overview Tab**

- Display all lead information in a clean, organized layout:
  - Name, Email, Phone, Company
  - Street Address, Post Code
  - Type of Property, Average Monthly Bill
  - Electricity Bill, Lead Status
  - Assigned To, Current Status
- Editable Note 1 and Note 2 fields with auto-save functionality
- Changes are automatically saved to the database when you blur the field

### 2. **Notes Tab**

- Add new timestamped notes to any lead
- View all notes with creation date/time in **IST (Indian Standard Time)** format
- Example timestamp format: `15 Jan 2024, 03:45:30 PM`
- Notes are stored in the `activity_notes` table (requires setup)
- Each note displays:
  - The note content
  - The exact date and time it was created (in IST)

### 3. **Activity Log Tab**

- Complete history of all changes made to the lead
- Tracks status changes with before/after values
- Tracks updates to Note 1 and Note 2
- Each log entry shows:
  - Action type (Status Changed, Note Updated, etc.)
  - Old value (for changes)
  - New value (for changes)
  - Timestamp in IST format
- Logs are stored in the `activity_logs` table (requires setup)

### 4. **Status Tab**

- Shows the current status at the top
- Easy button-based interface to change status
- All 9 status options available:
  - New
  - Not lifted
  - Not connected
  - Voice Message
  - Quotation sent
  - Site visit
  - Advance payment
  - Lead finished
  - Contacted
- Status changes are automatically logged in the activity log
- Current status button is disabled to prevent duplicate changes

## How to Use

### Open Lead Details

1. Go to the **Leads** page
2. Click on any cell in a lead row (except action buttons)
3. The Lead Details modal will open

### View Lead Information

- All lead details are displayed in the **Overview** tab
- Information is read-only unless you edit Note 1 or Note 2

### Edit Notes (Note 1 & Note 2)

1. In the **Overview** tab, click on the Note 1 or Note 2 text area
2. Edit the text as needed
3. Click outside the field (blur) to auto-save
4. A success toast notification will appear

### Add Activity Notes

1. Go to the **Notes** tab
2. Type your note in the "Add New Note" text area
3. Click the "Add Note" button
4. Your note will be added with the current timestamp in IST
5. All notes are displayed below with their timestamps

### Change Lead Status

1. Go to the **Status** tab
2. Click any status button to change the lead's status
3. The change will be logged in the Activity Log
4. A success toast notification will confirm the change

### View Activity History

1. Go to the **Activity** tab
2. See all changes in reverse chronological order (newest first)
3. Each entry shows:
   - What action was performed
   - When it was performed (IST timestamp)
   - Before and after values (for status changes)

## Technical Details

### Date/Time Formatting

All timestamps are formatted in **IST (Indian Standard Time)** which is UTC+5:30:

- Format: `DD MMM YYYY, HH:MM:SS AM/PM`
- Example: `15 Jan 2024, 03:45:30 PM`
- Uses JavaScript's `Intl.DateTimeFormat` with `Asia/Kolkata` timezone

### Files Modified

1. **client/components/LeadDetailsModal.tsx** (NEW)
   - Main modal component with all tabs and functionality
   - Handles all API calls to Supabase
   - Implements IST date formatting
   - Graceful error handling for missing tables

2. **client/pages/Leads.tsx** (MODIFIED)
   - Added import for `LeadDetailsModal`
   - Added state management:
     - `selectedLead`: Tracks which lead is currently being viewed
     - `openDetailsModal`: Controls modal visibility
   - Added handler functions:
     - `handleOpenLeadDetails()`: Opens the modal for a selected lead
     - `handleLeadUpdate()`: Updates the local state when a lead is modified
   - Made table rows clickable to open the modal
   - Integrated the `LeadDetailsModal` component into the page

### Database Tables Required

Two new tables are required in Supabase:

1. **activity_logs**
   - Tracks all changes to leads
   - Stores status changes, note updates, etc.
   - Includes timestamps and change details

2. **activity_notes**
   - Stores timestamped notes for leads
   - Separate from the default Note 1 and Note 2 fields
   - Includes creation timestamp

See `ACTIVITY_LOG_SETUP.md` for detailed instructions on creating these tables.

### Graceful Degradation

If the activity tables don't exist:

- ✅ The app continues to work normally
- ✅ Lead details are still viewable and editable
- ✅ Note 1 and Note 2 can still be edited
- ✅ Status can still be changed
- ❌ Activity Log tab shows "No activity recorded yet"
- ❌ Notes tab shows "No notes yet"
- The application logs warnings to the console but doesn't break

## Browser Compatibility

- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- IST timezone formatting works in all browsers supporting `Intl` API (all modern browsers)

## Performance Considerations

- Modal lazy-loads activity logs and notes only when opened
- Separate API calls for different data types
- Efficient filtering and sorting on the client side
- Indexes on `lead_id` and `created_at` in database tables for faster queries

## Future Enhancements

Potential improvements for future versions:

- Export activity log as PDF/CSV
- Bulk status changes with activity logging
- User attribution (show who made changes)
- Activity log filtering by date range or action type
- Email notifications when leads reach certain statuses
- Custom fields with activity tracking
- Automatic follow-up reminders based on activity log

## Troubleshooting

### Modal doesn't open when clicking on a lead

- Make sure you're clicking on a data cell, not an action button
- Try clicking on the lead name
- Check browser console for error messages

### Notes not saving

- Ensure `activity_notes` table exists in Supabase
- Check browser console for error messages
- Verify you have write permissions to the table

### Dates not in IST format

- Clear your browser cache
- Refresh the page
- Check browser support for Intl API

### Activity log not showing

- Ensure `activity_logs` table exists in Supabase
- Status changes should create entries in the log
- Check browser console for warnings

## Contact & Support

For issues or feature requests related to the Lead Details modal, please refer to the ACTIVITY_LOG_SETUP.md file for database setup instructions or check the browser console for detailed error messages.
