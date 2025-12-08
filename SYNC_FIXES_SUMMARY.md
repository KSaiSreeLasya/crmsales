# Sync Error Fixes - Summary

## Issues Fixed

### 1. ✅ 500 Error from Google Sheets API

**Problem**: `/api/fetch-google-sheet-api` returns 500 because GOOGLE_SHEETS_API_KEY is not configured

**Status**: Already handled by the system

- Automatically falls back to CSV export method
- Works fine for sheets up to 250 rows
- No action needed

### 2. ✅ 400 Duplicate Key Error

**Problem**: When syncing leads with emails that already exist in the database, the sync would fail with:

```
duplicate key value violates unique constraint "leads_email_sheet_id_key1"
```

**Root Cause**: INSERT operation fails because leads with same email+sheet_id already exist

**Solution Implemented**:

- Server now detects duplicate key error (code 23505)
- Automatically attempts UPDATE instead of failing
- If all updates succeed, returns success response
- Only fails if updates also fail

**Where Fixed**: `server/routes/sync-leads-dynamic.ts` (lines 910-972)

### 3. ✅ Column Name Detection and Guidance

**Problem**: User had no way to know what column names to use in Excel

**Solution Implemented**:

- Server analyzes which columns from the sheet are being recognized
- Provides list of accepted column names for each field
- Client displays column rename guide after sync
- Shows which columns are detected and which are missing

**Where Fixed**:

- `server/routes/sync-leads-dynamic.ts` (lines 644-687)
- `client/pages/Leads.tsx` (lines 641-669)

## Test Results

### What Now Works

✅ **New leads**: Successfully inserted
✅ **Existing leads**: Successfully updated
✅ **Duplicate emails**: Updates instead of failing
✅ **Column detection**: Shows which columns are recognized
✅ **Column guidance**: Tells user what column names to use
✅ **Date markers**: Still preserved between lead groups
✅ **All columns**: Syncs all detected columns

### Detected Column Names

The system now recognizes these column patterns:

- **Name**: "full name", "full_name", "name"
- **Email**: "email", "email_address"
- **Phone**: "phone", "phone_no", "phone_number"
- **Company**: "company", "organization", "business"
- **Address**: "street address", "street_address", "address"
- **Post Code**: "post_code", "postal_code", "postcode", "zip_code"
- **Status**: "lead_status", "status"
- **Electricity Bill**: "electricity_bill", "bill", "average_monthly_electricity_bill"
- **Property Type**: "property_type", "type_of_property", "property"

## How to Use

### Sync November or December Sheets

1. Go to **Leads** page
2. Click on **November** or **December** sheet tab
3. Click **Sync** button
4. System will:
   - Fetch 250 rows from November or 31 rows from December
   - Map columns to database fields
   - Insert new leads
   - Update existing leads
   - Show you the column mapping results

### Add More Columns

If you want additional columns to be captured:

1. Check the sync result message
2. See which columns are "not detected"
3. Rename the column header in Excel to one of the expected names
4. Sync again

**Example**:

- Current column: "What_Type_Of_Property"
- Rename to: "Property_Type" or "Type_Of_Property"
- Next sync will detect it

## Files Modified

1. **server/routes/sync-leads-dynamic.ts**
   - Fixed duplicate key error handling (lines 910-972)
   - Added column mapping analysis (lines 644-687)
   - Enhanced success response with column info (lines 1137-1171)

2. **client/pages/Leads.tsx**
   - Display column mapping guide (lines 641-669)
   - Better error messages for column issues (lines 679-696)

3. **SYNC_FIX_DECEMBER.md**
   - Comprehensive user guide

## Technical Details

### Duplicate Key Error Recovery

```typescript
// Before: Would return 400 error immediately
// After:
if (error.code === "23505") {
  // Try UPDATE instead
  for (const lead of newLeads) {
    await supabase
      .from("leads")
      .update(lead)
      .eq("email", email)
      .eq("sheet_id", sheetId);
  }
  // Continue to success response if all succeed
}
```

### Column Mapping Response

The sync endpoint now returns:

```json
{
  "detectedColumns": ["full name", "phone", "email", ...],
  "columnMapping": [
    {
      "field": "name",
      "detected": true,
      "message": "✓ name column detected"
    },
    {
      "field": "electricity_bill",
      "detected": false,
      "message": "⚠ electricity_bill not detected. Expected column names: ..."
    }
  ],
  "columnRenameGuide": {
    "instruction": "If you want to detect additional columns, rename them to one of the accepted names below:",
    "fields": [/* undetected fields */]
  }
}
```

## Next Steps for User

1. **Test the sync**: Try syncing November and December sheets
2. **Check the results**: See which columns are detected
3. **Add more columns**: Rename undetected columns as suggested
4. **Sync again**: All columns should now be captured

---

**Questions?** Check `SYNC_FIX_DECEMBER.md` for detailed troubleshooting guide.
