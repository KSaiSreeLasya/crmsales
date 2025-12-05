# Google Sheets Sync Verification Guide

## Overview

This guide explains how to verify and test the Google Sheets sync configuration, particularly for the October, November, and December sheets.

## Configured Sheet IDs

The application is configured to sync the following sheets:

| Month    | Sheet ID     | Status                |
| -------- | ------------ | --------------------- |
| October  | `0`          | Default/Primary Sheet |
| November | `1892152973` | Secondary Sheet       |
| December | `1355430272` | Secondary Sheet       |

**Spreadsheet ID:** `1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM`

## Validation Requirements

The application uses consistent validation across all sync endpoints:

- **Name:** Required (cannot be empty)
- **Email:** Required (cannot be empty, used as unique constraint)
- **Phone:** Optional (for consistency between scheduled and dynamic sync)

### Previous Inconsistency (FIXED)

Previously, `sync-leads-scheduled.ts` required phone numbers, but `sync-leads-dynamic.ts` made them optional. This has been fixed - both endpoints now use consistent validation.

## Verification Endpoints

### 1. Verify Sheet Accessibility

**Endpoint:** `GET /api/verify-sheets`

Tests whether all configured sheets are accessible and returns basic metadata.

**Query Parameters:**

- `spreadsheetId` (optional): Spreadsheet ID to test (defaults to configured ID)

**Example:**

```bash
curl "http://localhost:5173/api/verify-sheets"
```

**Response:**

```json
{
  "spreadsheetId": "1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "sheets": [
    {
      "name": "October",
      "id": "0",
      "accessible": true,
      "rowCount": 245,
      "sampleColumns": ["name", "email", "phone", "company", "address"]
    },
    {
      "name": "November",
      "id": "1892152973",
      "accessible": true,
      "rowCount": 189,
      "sampleColumns": ["Full Name", "Email", "Phone", "Company", "Location"]
    },
    {
      "name": "December",
      "id": "1355430272",
      "accessible": false,
      "error": "Sheet not found (check ID)"
    }
  ],
  "summary": {
    "total": 3,
    "accessible": 2,
    "failed": 1
  },
  "allSheetsOk": false,
  "message": "⚠ 2/3 sheets accessible. 1 sheet(s) failed - check sheet IDs"
}
```

### 2. Test Sync for All Sheets (Dry Run)

**Endpoint:** `POST /api/test-sync-all-sheets`

Tests the complete sync process without saving to database. Validates that all sheets can be fetched and parsed correctly.

**Query Parameters:**

- `spreadsheetId` (optional): Spreadsheet ID to test (defaults to configured ID)
- `dryRun` (optional): Set to `"false"` to actually sync data (default is `"true"`)

**Example (Dry Run - Recommended):**

```bash
curl -X POST "http://localhost:5173/api/test-sync-all-sheets?dryRun=true"
```

**Example (Actual Sync):**

```bash
curl -X POST "http://localhost:5173/api/test-sync-all-sheets?dryRun=false"
```

**Response:**

```json
{
  "spreadsheetId": "1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dryRun": true,
  "sheets": [
    {
      "name": "October",
      "sheetId": "0",
      "success": true,
      "totalRows": 250,
      "validLeads": 245,
      "invalidRows": 5,
      "dateRows": 0,
      "columns": ["name", "email", "phone", "company", "address"],
      "sampleLeads": [
        {
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+91-9876543210"
        }
      ]
    },
    {
      "name": "November",
      "sheetId": "1892152973",
      "success": true,
      "totalRows": 195,
      "validLeads": 189,
      "invalidRows": 6,
      "dateRows": 0,
      "columns": ["Full Name", "Email", "Phone", "Company", "Location"],
      "sampleLeads": [
        {
          "name": "Jane Smith",
          "email": "jane@example.com",
          "phone": "+91-8765432109"
        }
      ]
    },
    {
      "name": "December",
      "sheetId": "1355430272",
      "success": false,
      "totalRows": 0,
      "validLeads": 0,
      "invalidRows": 0,
      "error": "Sheet ID not found"
    }
  ],
  "summary": {
    "totalSheets": 3,
    "successfulSheets": 2,
    "failedSheets": 1,
    "totalLeadsFound": 445,
    "totalValidLeads": 434
  },
  "allSheetsOk": false,
  "message": "⚠ 2/3 sheets successful. 1 sheet(s) failed - check sheet IDs and Google Sheets API configuration."
}
```

## How to Verify Sheet IDs

### Method 1: Using the Google Sheets UI

1. Open your Google Sheets spreadsheet
2. For each sheet tab (October, November, December):
   - Right-click on the sheet tab
   - Look at the URL or use the sheet metadata
   - The sheet ID is the numeric identifier used internally by Google Sheets

### Method 2: Using Google Sheets API

1. Ensure `GOOGLE_SHEETS_API_KEY` is configured in your environment
2. Use the fetch-google-sheets-metadata endpoint:

   ```bash
   curl "http://localhost:5173/api/fetch-google-sheets-metadata?spreadsheetId=1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM"
   ```

3. This will return the actual sheet IDs from Google's API:
   ```json
   {
     "success": true,
     "sheets": [
       { "id": "0", "name": "October" },
       { "id": "1892152973", "name": "November" },
       { "id": "1355430272", "name": "December" }
     ]
   }
   ```

### Method 3: Checking Browser Network Requests

1. Open your browser's Developer Tools (F12)
2. Go to the Leads page
3. Open the Network tab
4. Trigger a sheet sync
5. Look for the request to `/api/test-sync-all-sheets`
6. Examine the response to see which sheets are working

## Troubleshooting

### Issue: "Sheet not found" or "Sheet ID mismatch"

**Possible Causes:**

1. Sheet ID is incorrect
2. Sheet was deleted or renamed in Google Sheets
3. The sheet is not part of the configured spreadsheet
4. Google Sheets API is not accessible

**Solutions:**

1. Verify sheet IDs match the actual sheets in your Google Sheets document
2. Use the `/api/fetch-google-sheets-metadata` endpoint to get current sheet IDs
3. Update the sheet IDs in:
   - `netlify/functions/sync-leads-scheduled.ts`
   - `server/routes/fetch-google-sheets-metadata.ts`
   - `client/pages/Leads.tsx`

### Issue: "GOOGLE_SHEETS_API_KEY not configured"

The application has a fallback to hardcoded sheet IDs when the API key is not available. To enable dynamic sheet detection:

1. Get a Google Sheets API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Set the environment variable:
   ```bash
   GOOGLE_SHEETS_API_KEY=your_api_key_here
   ```

### Issue: Validation errors - "No valid leads found"

**Possible Causes:**

1. Sheet columns don't match expected format (name, email required)
2. Data rows are missing required fields

**Solutions:**

1. Check that each data row has:
   - A name or full name column
   - An email address column
2. Phone is optional but recommended
3. Use `/api/test-sync-all-sheets?dryRun=true` to see exactly which rows are failing validation

## Recent Changes (Fixes)

### Validation Consistency Fix

**Files Modified:**

- `netlify/functions/sync-leads-scheduled.ts`: Updated `validateLead()` function to make phone optional

**What Changed:**

- Previously: Required name, email, AND phone
- Now: Required name and email, phone is optional
- This matches the behavior of `sync-leads-dynamic.ts`

**Impact:**

- More leads will pass validation
- Scheduled syncs will now include leads without phone numbers
- Consistent behavior across all sync methods

## Next Steps

1. Run `/api/verify-sheets` to check connectivity
2. Run `/api/test-sync-all-sheets?dryRun=true` to validate data
3. If all tests pass, enable scheduled syncs with confidence
4. Monitor the scheduled sync logs in Netlify dashboard

## Contact & Support

For issues with Google Sheets API or sheet IDs:

- Check the server logs for detailed error messages
- Run the verification endpoints to diagnose issues
- Ensure the spreadsheet ID and sheet IDs are correct
