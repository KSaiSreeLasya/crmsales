# Sync Error Fix Guide - November & December Sheets

## Issues Fixed

Your sync was failing with two types of errors:

1. **500 Error from `/api/fetch-google-sheet-api`** - This is because the Google Sheets API key is not configured
   - ✓ **Fixed**: The system automatically falls back to CSV export method, which works fine

2. **400 Error from `/api/sync-leads-dynamic`** - This was a duplicate key constraint error
   - ✓ **Fixed**: When leads already exist in the database, the system now properly updates them instead of failing
   - ✓ **Enhanced**: The system now shows you which columns were detected and which column names to use in Excel

## How Column Name Detection Works

The system now shows you:

- **✓ Detected columns** - Column headers that were recognized (like "name", "email", "phone")
- **⚠ Undetected columns** - Column headers that should be renamed to be recognized

### Accepted Column Names for Each Field

| Field                | Accepted Column Names in Excel                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| **Name**             | "Full Name", "Full_Name", "Name"                                                                        |
| **Email**            | "Email", "Email_Address", "Email Address"                                                               |
| **Phone**            | "Phone", "Phone_No", "Phone_Number"                                                                     |
| **Company**          | "Company", "Organization", "Business"                                                                   |
| **Address**          | "Street Address", "Street_Address", "Address"                                                           |
| **Post Code**        | "Post_Code", "Postal_Code", "Postcode", "Zip_Code"                                                      |
| **Status**           | "Lead_Status", "Status"                                                                                 |
| **Electricity Bill** | "What_Is_Your_Average_Monthly_Electricity_Bill", "Electricity_Bill", "Average_Monthly_Electricity_Bill" |
| **Property Type**    | "What_Type_Of_Property_Do_You_Want_To_Install_Solar_On", "Type_Of_Property", "Property_Type"            |

## Current Column Headers in Your Sheets

### November Sheet Headers

```
what_type__of_property__do_you_want__to_install_solar_on?
what_is_your_average_monthly_electricity_bill?
full name
phone
email
street address
post_code
lead_status
```

### December Sheet Headers

```
what_type_of_property_do_you_want_to_install_solar_on?
what_is_your_average_monthly_electricity_bill?
full name
phone
email
street address
post_code
lead_status
```

## To Capture Additional Columns

The system currently recognizes: `name`, `email`, `phone`, `street_address`, `post_code`, `lead_status`

If you want the following columns to be captured, rename them in your Excel sheet:

- **electricity_bill** - Rename to: "Average_Monthly_Electricity_Bill" or "Electricity_Bill"
- **property_type** - Rename to: "Property_Type" or "Type_Of_Property"

> **Note**: The exact column name doesn't matter as long as it contains the key words. For example:
>
> - ✓ "What Type of Property" works (contains "type" and "property")
> - ✓ "Property Type" works
> - ✗ "Solar Installation Type" might not work (missing "property")

## Sync Now Works For

✓ **New leads** - Automatically inserts new leads
✓ **Existing leads** - Automatically updates existing leads (preserves assigned_to)
✓ **Duplicate emails** - When the same email exists in the sheet, updates instead of failing
✓ **Date markers** - Creates date separators between lead groups
✓ **All column values** - Syncs all detected columns, not just standard fields

## What Happens After Sync

After syncing, you'll see:

1. Number of leads synced
2. Number of new leads added
3. Number of existing leads updated
4. Which columns were detected
5. Which column names to use for additional columns

## If You Still Have Issues

1. **Check that the sheet ID is correct** - Make sure you're syncing from the right sheet
2. **Verify email addresses** - At least one email must be present for each row
3. **Check for duplicate rows** - If same email exists multiple times, it will be counted as one lead
4. **Run diagnostics** - Click "Sync" button and check the console logs (press F12 > Console)

## Testing the Fix

1. Go to the **Leads** page
2. Click on the **November** or **December** sheet tab
3. Click the **Sync** button
4. The system should now:
   - Successfully sync leads
   - Update existing leads instead of failing
   - Show you which columns were detected
   - Tell you what column names to use for additional fields

---

**Need help?** Check your browser console (F12 > Console tab) for detailed sync logs. The system logs everything that happens during sync for debugging.
