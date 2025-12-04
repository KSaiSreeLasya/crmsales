# November Sheet Sync Issue - Root Cause and Solutions

## Problem

When syncing the "November" sheet, the system fetches 250 rows from Google Sheets via CSV export but saves 0 leads to the database.

## Root Cause

The Supabase database schema requires the following fields to be **NOT NULL** for every lead:

- `name` (Full Name)
- `email` (Email - must be UNIQUE)
- `phone` (Phone Number)
- `company` (Company Name)

If any of these fields are missing or empty in the CSV data, the lead is skipped during sync.

## Why This Happens

1. **API v4 Sync Fails**: The `/api/fetch-google-sheet-api` endpoint returns a 500 error because `GOOGLE_SHEETS_API_KEY` environment variable is not configured.
2. **Fallback to CSV Export**: The system automatically falls back to CSV export method and successfully fetches 250 rows.
3. **Field Mapping Issue**: The November sheet may have:
   - Missing columns for required fields
   - Column names that don't match expected patterns (e.g., "Email" vs "email", "Contact Email", etc.)
   - Empty values in required columns
4. **Silent Failure**: All 250 rows are filtered out during validation, resulting in 0 leads being saved.

## Solutions

### Solution 1: Configure Google Sheets API Key (Recommended for Large Sheets)

For sheets with 500+ rows, using the Google Sheets API v4 is recommended as it's faster and more reliable than CSV export.

1. **Get an API Key**:
   - Go to Google Cloud Console: https://console.cloud.google.com/
   - Create a new project
   - Enable "Google Sheets API"
   - Create an API key (Credentials → Create Credentials → API Key)

2. **Set the Environment Variable**:
   - Add `GOOGLE_SHEETS_API_KEY=your_api_key` to your `.env` file
   - Restart the dev server

3. **Verify**: Try syncing again - you should see faster loading times

### Solution 2: Fix Your Google Sheet Columns (Quick Fix)

Ensure your November sheet has these exact columns:

| Column Name                                                       | Description            | Notes                                     |
| ----------------------------------------------------------------- | ---------------------- | ----------------------------------------- |
| Full Name                                                         | Lead's complete name   | Required, cannot be empty                 |
| Email                                                             | Lead's email address   | Required, cannot be empty, must be unique |
| Phone                                                             | Lead's phone number    | Required, cannot be empty                 |
| Company                                                           | Company name           | Required, cannot be empty                 |
| (Optional) Street Address                                         | Physical address       |                                           |
| (Optional) Post Code                                              | Postal code            |                                           |
| (Optional) Lead Status                                            | Current status of lead |                                           |
| (Optional) What type of property do you want to install solar on? | Property type          |                                           |
| (Optional) What is your average monthly electricity bill?         | Monthly bill amount    |                                           |

**Column Name Variations Supported**:

- Name: "Full Name", "full_name", "name", "Name"
- Email: "Email", "email", "Email Address", "email_address", "Contact Email"
- Phone: "Phone", "phone", "Phone No", "phone_no", "Phone Number", "Telephone"
- Company: "Company", "organization", "Organization", "Business"

### Solution 3: Check Data Quality

1. **Open your November sheet in Google Sheets**
2. **Verify** that the first 10 rows have:
   - Non-empty Full Name column
   - Non-empty Email column (valid email format)
   - Non-empty Phone column
   - Non-empty Company column
3. **Delete or fix** any rows missing these required values

### Solution 4: Review Sync Logs

After making changes, try syncing again and check the browser console:

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for messages like:
   - `[SYNC] Row 5 skipped - missing required fields: email, phone`
   - This tells you exactly which rows and which fields are problematic

## Testing the Fix

1. **Make one of the solutions above**
2. **Click "Sync" on the November sheet**
3. **Expected outcomes**:
   - If successful: `✓ Synced X leads from November`
   - If data is missing: `All leads were skipped - missing required fields (name, email, phone, company)`
   - If column names don't match: Check console logs for detailed field mapping info

## Need More Help?

- **Check browser console** (F12) for detailed error messages
- **Review the CSV sample** in console logs to see what columns are being detected
- **Verify sheet name** matches "November" exactly
- **Check for hidden rows/columns** in Google Sheets that might be affecting data

## Technical Details

The improved sync logic now:

1. ✅ Maps column names with flexible pattern matching
2. ✅ Provides detailed error messages showing missing fields
3. ✅ Logs sample data for debugging
4. ✅ Shows which rows are skipped and why
5. ✅ Handles variations in column naming conventions
