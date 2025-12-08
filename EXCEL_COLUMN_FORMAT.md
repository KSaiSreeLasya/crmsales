# Excel Column Header Format Guide

## How to Name Your Columns in Excel

Your November and December sheets currently have these column headers:

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

The system recognizes most of these correctly, but the header names with special characters and underscores might not match perfectly.

## Column Header Rules

### Rule 1: Case Doesn't Matter

✅ "Full Name" works
✅ "full name" works
✅ "FULL NAME" works
✅ "full_name" works
❌ Don't worry about capitalization

### Rule 2: Underscores and Spaces Are Interchangeable

✅ "full name" (with space)
✅ "full_name" (with underscore)
✅ "Full_Name" (mixed)
✅ "full name" (multiple spaces)

### Rule 3: Special Characters Are Removed

Your current: "what_type**of_property**do_you_want\_\_to_install_solar_on?"
The system sees: "what type of property do you want to install solar on"

Then it looks for keywords:

- Contains "property"? ✅ Yes
- Contains "type"? ✅ Yes
- Contains "solar"? ✅ Yes
  → **Recognized as**: Property Type column ✅

### Rule 4: Keywords Matter Most

The system looks for these keywords to identify columns:

**Name Column**

- Must contain: "name"
- Examples that work: "Full Name", "Name", "full_name", "Customer Name"

**Email Column**

- Must contain: "email" or "mail"
- Examples that work: "Email", "email_address", "e-mail", "contact_email"

**Phone Column**

- Must contain: "phone" or "contact" or "mobile" or "telephone"
- Examples that work: "Phone", "phone_no", "contact_phone", "Mobile Number"

**Company Column**

- Must contain: "company" or "organization" or "business"
- Examples that work: "Company", "Company Name", "Organization"

**Address Column**

- Must contain: "address" or "street"
- Examples that work: "Street Address", "Address", "street_address"

**Post Code Column**

- Must contain: "post" or "code" or "zip"
- Examples that work: "Post_Code", "Postal Code", "ZIP Code", "postcode"

**Status Column**

- Must contain: "status"
- Examples that work: "Lead_Status", "Status", "lead status"

**Electricity Bill Column**

- Must contain: "bill" or "electricity" or "monthly"
- Examples that work: "Electricity Bill", "avg_bill", "Average Monthly Bill"
- Your current column is recognized: "what_is_your_average_monthly_electricity_bill?" ✅

**Property Type Column**

- Must contain: "property" or "type" or "solar"
- Examples that work: "Property Type", "Type of Property", "Property"
- Your current column is recognized: "what_type_of_property_do_you_want_to_install_solar_on?" ✅

## Recommended Column Headers

To ensure all columns are recognized, use these header names (copy exactly):

### Simple Format (Easiest)

```
Full Name
Email
Phone
Company
Street Address
Post Code
Status
Electricity Bill
Property Type
```

### With Underscores (Also Works)

```
full_name
email
phone
company
street_address
post_code
status
electricity_bill
property_type
```

### Your Current Format (Also Recognized)

Your current headers are already recognized by the system:

```
full name                                    → ✓ Recognized
email                                        → ✓ Recognized
phone                                        → ✓ Recognized
street address                               → ✓ Recognized
post_code                                    → ✓ Recognized
lead_status                                  → ✓ Recognized
what_is_your_average_monthly_electricity_bill? → ✓ Recognized (long name but OK)
what_type_of_property_do_you_want_to_install_solar_on? → ✓ Recognized (long name but OK)
```

**You don't need to change your headers!** They're already working. ✅

## If You Want to Add New Columns

Just add a new column header that contains one of these keywords:

| New Column    | Use This Header                                 |
| ------------- | ----------------------------------------------- |
| Lead Source   | "Lead Source" (contains "source" or "lead")     |
| Contact Date  | "Contact Date" (contains "date" or "contact")   |
| Notes         | "Notes" or "Comments"                           |
| Business Type | "Business Type" (contains "type" or "business") |

## What If Column Is Still Not Recognized?

If you add a new column and it's still not recognized:

1. **Check the keyword**: Make sure your header contains one of the keyword phrases
2. **Remove special characters**: Use spaces or underscores instead of ?, !, -, etc.
3. **Use simple names**: Avoid very long header names
4. **Rename to simple version**: Instead of "what_is_the_lead_source", use "Lead Source"

## Test Your Headers

After updating your Excel headers:

1. Save the file in Google Sheets
2. Go to the Leads page
3. Click Sync button
4. Check the "Column Mapping" in the result
5. You should see all your columns listed as "✓ Detected"

---

**Your current headers are already working!** No changes needed unless you want to add new columns or simplify the header names.
