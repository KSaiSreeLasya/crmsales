# Fixing Google Sheets Column Alignment Issues

## Problem Diagnosis

Your Google Sheets synchronization is failing due to **column alignment issues**. This happens when:

1. **Headers don't match data columns** - The column header row has different values than the data rows
2. **Misaligned data** - Data values are shifted relative to the column headers
3. **Missing or incorrectly named columns** - Required columns (Name, Email) are missing or named differently

### Error Symptoms

If you see errors like:

- `"No valid leads found - column alignment issue detected"`
- CSV sample showing: `"full name": "3000"` (number instead of name)
- `"email": "917799886836"` (phone number instead of email)

This indicates **data is shifted one or more columns** from the headers.

## Example of Misaligned Data

**WRONG (Your Current Sheet):**

```
Column Headers:     | electricity_bill? | full name  | phone        | email              | street address | post_code
Your Data:          | individual_house  | 3000       | Shiva kumar  | 917799886836      | shivakumarnani007@gmail.com | patancheru
Expected (if cols): | TYPE_OF_PROP      | MONTHLY_$ | FULL_NAME   | PHONE             | EMAIL         | ADDRESS

Result: Column mismatch! Data doesn't align with headers.
```

**CORRECT (What It Should Be):**

```
Column Headers:     | TYPE OF PROPERTY | MONTHLY BILL | FULL NAME    | PHONE        | EMAIL                       | STREET ADDRESS | POSTAL CODE
Your Data:          | individual_house | 3000         | Shiva Kumar  | 917799886836 | shivakumarnani007@gmail.com | patancheru     | 502327

Result: Columns align! Data matches headers.
```

## Step-by-Step Fix

### Step 1: Use the Diagnostic Tool

Before syncing, use the new diagnostic endpoint to identify column issues:

1. Navigate to your Leads page
2. Look for the sheet you're syncing (October, November, December, etc.)
3. Click **"Run Diagnostics"** button to scan the sheet structure
4. The diagnostic tool will show:
   - All column names in order
   - Sample data from the first row
   - Detected issues
   - What data type each column contains

### Step 2: Fix Column Headers in Google Sheet

**Action:** Ensure your Google Sheet headers match exactly (case-insensitive):

✅ **Required Column Names (use ONE of each):**

- Name Column: `Full Name`, `Name`, `full_name`, `fullname`
- Email Column: `Email`, `email_address`, `Email Address`
- Phone Column: `Phone`, `Phone Number`, `phone_no`, `Mobile`

✅ **Recommended Column Names (for full functionality):**

- `Type of Property` - Solar installation property type (residential, commercial, etc.)
- `Monthly Electricity Bill` - or `Average Monthly Bill`, `Current Bill`
- `Street Address` - or `Address`, `Street`
- `Postal Code` - or `Post Code`, `Postcode`, `ZIP`
- `Lead Status` - Current status of the lead
- `Feedback 1` - or `Note 1`, `Notes 1`
- `Feedback 2` - or `Note 2`, `Notes 2`

### Step 3: Verify Column Order

**Important:** The ORDER of columns matters less than the NAME being correct.

1. Open your Google Sheet (October, November, December sheets)
2. **Check the first row** - these should be your column headers
3. Ensure headers are in the **first row** with no empty rows above
4. Check that **no data rows are mixed into the header row**

### Step 4: Check for Data Row Issues

**Issue: Data starting in wrong row**

If your data doesn't start immediately after headers:

- Delete any blank rows between headers and data
- Ensure no formatting rows are in the header row
- Verify the first data row comes directly after the header row

**Example of Bad Structure:**

```
Row 1: [Header] Full Name | Email | Phone
Row 2: [Empty]
Row 3: [Data]   John      | john@email.com | 9876543210
       ❌ Gap between header and data!
```

**Example of Good Structure:**

```
Row 1: [Header] Full Name | Email | Phone
Row 2: [Data]   John      | john@email.com | 9876543210
       ✅ Data immediately after header!
```

### Step 5: Verify Column Names Match

**Run these checks:**

1. **Name Column Check:**
   - Does it contain actual names (text)?
   - Not numbers like "3000"?
   - Not phone numbers like "917799886836"?

2. **Email Column Check:**
   - Does it contain email addresses (format: `something@domain.com`)?
   - Not names?
   - Not phone numbers?
   - Not addresses?

3. **Phone Column Check:**
   - Does it contain phone numbers?
   - Not empty?
   - Not emails?

## Using the Diagnostic Tool

### API Endpoint (Advanced)

```bash
GET /api/diagnose-sheet-columns?spreadsheetId=YOUR_SHEET_ID&sheetId=SHEET_ID

Example:
GET /api/diagnose-sheet-columns?spreadsheetId=1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM&sheetId=1892152973
```

### Response Example

```json
{
  "status": "ok",
  "totalRows": 181,
  "columnCount": 7,
  "columnNames": [
    "electricity_bill?",
    "full name",
    "phone",
    "email",
    "street address",
    "post_code",
    "FEEDBACK -1"
  ],
  "sampleRows": [
    {
      "rowNum": 0,
      "columns": {
        "full name": {
          "value": "3000",
          "type": "number",
          "fullLength": 4
        },
        "email": {
          "value": "917799886836",
          "type": "phone",
          "fullLength": 12
        }
      }
    }
  ],
  "issues": [
    "Warning: Column 'email' has header 'email' but no values look like email addresses",
    "Warning: Column 'full name' has header 'name' but values don't look like names"
  ],
  "recommendation": "Column alignment issues detected. Check your Google Sheet structure."
}
```

### Interpreting Diagnostic Results

**If you see:**

- `"type": "number"` in the name column → Name column contains numbers (WRONG!)
- `"type": "phone"` in the email column → Email column contains phone numbers (WRONG!)
- `"type": "address"` in the email column → Email column contains addresses (WRONG!)

**Action Required:**

- Check if your columns are in the wrong order
- Check if the header row is correct
- Consider reorganizing your sheet

## Quick Fixes

### Fix 1: Rename Columns to Match Expected Names

| Current Header      | Change To          |
| ------------------- | ------------------ |
| `electricity_bill?` | `Type of Property` |
| `full name`         | `Full Name`        |
| `phone`             | `Phone`            |
| `email`             | `Email`            |
| `street address`    | `Street Address`   |
| `post_code`         | `Postal Code`      |
| `FEEDBACK -1`       | `Feedback 1`       |
| `FEEDBACK -2`       | `Feedback 2`       |

### Fix 2: Rearrange Columns (if needed)

Recommended column order (left to right):

1. Type of Property
2. Monthly Electricity Bill
3. Full Name ← **CRITICAL**
4. Phone ← **CRITICAL**
5. Email ← **CRITICAL**
6. Street Address
7. Postal Code
8. Lead Status
9. Feedback 1
10. Feedback 2

### Fix 3: Remove Duplicate Headers or Empty Rows

- Delete any rows above the actual header row
- Delete any blank rows between header and data
- Delete rows with formatting-only content

## Verification Checklist

Before syncing, verify:

- [ ] **First row contains headers**, not data
- [ ] **No blank rows** between header and first data row
- [ ] **Column "Full Name"** (or similar) contains actual names
- [ ] **Column "Email"** (or similar) contains email addresses (with `@`)
- [ ] **Column "Phone"** (or similar) contains phone numbers
- [ ] **All required columns present:** Name, Email, Phone
- [ ] **Column names are spelled correctly** (Google Sheets is case-insensitive)
- [ ] **No extra columns** before the header row

## Testing After Fix

1. Go to Leads page
2. Select the problematic sheet (October, November, or December)
3. Click **"Run Diagnostics"** again
4. Verify issues are resolved (should show green checkmark)
5. Try syncing again

## Still Having Issues?

### Issue: Diagnostic shows correct structure but sync still fails

**Try:**

1. Download the sheet as CSV to inspect manually
2. Check for special characters or encoding issues
3. Verify email addresses don't have typos (missing @)
4. Check for leading/trailing spaces in values

### Issue: Can't find the diagnostic button

**Try:**

1. Refresh your browser (Ctrl+R or Cmd+R)
2. Clear browser cache
3. Try a different browser

### Issue: Diagnostic API returns 500 error

**Check:**

1. Is the spreadsheet ID correct?
2. Is the sheet ID correct?
3. Can you access the sheet manually in Google Sheets?
4. Try the `October` sheet first (it's known to have issues)

## Google Sheets Best Practices

To prevent this issue in the future:

1. **Use clear, descriptive headers** in the first row
2. **Keep headers consistent** across all sheets
3. **Don't merge header cells** (use separate columns instead)
4. **Put headers in Row 1** (never skip rows)
5. **Use consistent data formats**:
   - Names: Text only (no numbers)
   - Email: Must contain `@` and domain
   - Phone: Numbers only (can include +, -, or spaces)
6. **Sort/organize data AFTER headers**, not before

## Contact Support

If you've followed all steps and still have issues:

1. Run the diagnostic and save the output
2. Note which sheets (October, November, December) are affected
3. Note any error messages from the sync attempt
4. Contact support with this information
