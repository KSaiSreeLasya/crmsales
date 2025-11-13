/**
 * Google Sheets Integration
 * Utilities to sync leads and salespersons from Google Sheets to Supabase
 *
 * Expected columns for Leads: Name, Email, Company, Phone, Assigned to, Status, Note1, Note2
 * Expected columns for Salespersons: Name, Email, Phone, Department, Region
 */

import { LeadStatus } from "./supabase";

export interface GoogleSheetRow {
  [key: string]: string | number | undefined;
}

/**
 * Normalize column names (case-insensitive, trim whitespace, remove quotes)
 */
function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/^["']|["']$/g, "") // Remove leading/trailing quotes
    .replace(/\s+/g, "_");
}

/**
 * Find a column value by multiple possible names
 */
function getColumnValue(
  row: GoogleSheetRow,
  ...possibleNames: string[]
): string {
  for (const name of possibleNames) {
    const normalizedName = normalizeKey(name);
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = normalizeKey(key);
      if (normalizedKey === normalizedName && value) {
        const result = String(value).trim().replace(/^["']|["']$/g, "");
        if (result) return result;
      }
    }
  }
  return "";
}

/**
 * Parse Google Sheet lead row into Lead format
 * Expected column order (based on user's sheet):
 * 0: what_type_of_property_do_you_want_to_install_solar_on?
 * 1: what_is_your_average_monthly_electricity_bill?
 * 2: full name
 * 3: phone
 * 4: email
 * 5: street address
 * 6: post_code
 * 7: lead_status (and feedback columns)
 */
export function parseLeadRow(row: GoogleSheetRow) {
  // Get all values as an array in order
  const values = Object.values(row).filter((v) => v !== undefined);

  const parsed = {
    // Try position-based first, then fallback to name-based
    company:
      values[0] || // Position 0: property type
      getColumnValue(row, "what_type_of_property", "property") ||
      "N/A",
    electricity_bill:
      values[1] || // Position 1: electricity bill
      getColumnValue(row, "electricity", "bill") ||
      "",
    name:
      values[2] || // Position 2: full name
      getColumnValue(row, "full name", "name") ||
      "",
    phone:
      values[3] || // Position 3: phone
      getColumnValue(row, "phone") ||
      "",
    email:
      values[4] || // Position 4: email
      getColumnValue(row, "email") ||
      "",
    street_address:
      values[5] || // Position 5: street address
      getColumnValue(row, "street address", "address") ||
      "",
    post_code:
      values[6] || // Position 6: post code
      getColumnValue(row, "post code", "postcode") ||
      "",
    lead_status:
      values[7] || // Position 7+: lead status and feedback
      getColumnValue(row, "lead status", "feedback") ||
      "",
    status: "Not lifted" as LeadStatus,
    assignedTo: "Unassigned",
    note1: "",
    note2: "",
  };

  console.log("Parsed lead from values:", {
    company: parsed.company,
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone,
  });
  return parsed;
}

/**
 * Parse Google Sheet salesperson row into Salesperson format
 * Expected columns: Name, Email, Phone
 */
export function parseSalespersonRow(row: GoogleSheetRow) {
  return {
    name: getColumnValue(row, "Name"),
    email: getColumnValue(row, "Email"),
    phone: getColumnValue(row, "Phone"),
  };
}

/**
 * Extract spreadsheet ID from Google Sheets URL
 * Supports formats:
 * - https://docs.google.com/spreadsheets/d/{id}/edit
 * - https://docs.google.com/spreadsheets/d/{id}
 */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Build Google Sheets CSV export URL
 */
export function getGoogleSheetsCsvUrl(
  spreadsheetId: string,
  sheetId: string = "0",
): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetId}`;
}

/**
 * Parse CSV content into rows
 */
export function parseCsv(csv: string): GoogleSheetRow[] {
  const lines = csv.trim().split("\n");
  if (lines.length === 0) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  console.log("CSV Headers count:", headers.length);
  console.log("CSV Headers:", headers);

  // Parse data rows, skip empty rows
  const rows: GoogleSheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;

    const values = parseCSVLine(lines[i]);
    const row: GoogleSheetRow = {};

    headers.forEach((header, index) => {
      if (header) {
        row[header] = values[index] || "";
      }
    });

    // Only add row if it has at least one non-empty cell
    if (Object.values(row).some((val) => val && String(val).trim())) {
      rows.push(row);
    }
  }

  console.log("Total parsed data rows:", rows.length);
  if (rows.length > 0) {
    console.log("First data row keys:", Object.keys(rows[0]));
    console.log("First data row:", rows[0]);

    // Show which columns we can find
    const sampleRow = rows[0];
    console.log("Sample column values:");
    console.log(
      "  Full Name / full name:",
      sampleRow["full name"] || sampleRow["Full Name"] || "NOT FOUND",
    );
    console.log(
      "  Email:",
      sampleRow["email"] || sampleRow["Email"] || "NOT FOUND",
    );
    console.log(
      "  Phone:",
      sampleRow["phone"] || sampleRow["Phone"] || "NOT FOUND",
    );
  }

  return rows;
}

/**
 * Parse a single CSV line (handles quoted values properly)
 * Properly handles RFC 4180 CSV format with quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote within quoted field
        current += '"';
        i++; // Skip the next quote
      } else if (!inQuotes && current === "") {
        // Start of quoted field (only if at field start)
        inQuotes = true;
      } else if (inQuotes) {
        // End of quoted field
        inQuotes = false;
      } else {
        // Quote in unquoted field - just skip it
        continue;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator (only when not in quotes)
      const trimmed = current.trim().replace(/^"|"$/g, "");
      result.push(trimmed);
      current = "";
    } else {
      current += char;
    }
  }

  // Add the last field
  const trimmed = current.trim().replace(/^"|"$/g, "");
  result.push(trimmed);

  return result;
}

/**
 * Fetch and parse Google Sheet
 * Uses CSV export endpoint which doesn't require authentication
 */
export async function fetchGoogleSheet(
  spreadsheetId: string,
  sheetId?: string,
): Promise<GoogleSheetRow[]> {
  try {
    const url = getGoogleSheetsCsvUrl(spreadsheetId, sheetId || "0");
    console.log("Fetching Google Sheet from:", url);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        "Google Sheets fetch failed:",
        response.status,
        response.statusText,
      );
      throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
    }

    const csv = await response.text();
    console.log("Raw CSV data:", csv.substring(0, 500)); // First 500 chars
    const rows = parseCsv(csv);
    console.log("Parsed rows count:", rows.length);
    if (rows.length > 0) {
      console.log("First row keys:", Object.keys(rows[0]));
      console.log("First row data:", rows[0]);
    }
    return rows;
  } catch (error) {
    console.error("Error fetching Google Sheet:", error);
    throw error;
  }
}

/**
 * Sync leads from Google Sheet to Supabase
 * This would be called from the backend to maintain data consistency
 */
export async function syncLeadsFromGoogleSheet(
  spreadsheetId: string,
  sheetId?: string,
) {
  try {
    const rows = await fetchGoogleSheet(spreadsheetId, sheetId);
    console.log("Fetched", rows.length, "rows from Google Sheet");

    const leads = rows.map(parseLeadRow).filter((lead) => lead.name); // Only rows with names
    console.log("Parsed", leads.length, "valid leads");

    if (leads.length === 0) {
      throw new Error("No valid leads found in Google Sheet");
    }

    console.log("First lead to sync:", leads[0]);

    // Send to backend for syncing to Supabase
    const response = await fetch("/api/sync-leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leads,
        source: "google_sheet",
      }),
    });

    const responseData = await response.json();
    console.log("Server response:", responseData);

    if (!response.ok) {
      console.error("Server error response:", responseData);
      throw new Error(
        responseData.message || responseData.error || "Failed to sync leads to database"
      );
    }

    return responseData;
  } catch (error) {
    console.error("Error syncing leads from Google Sheet:", error);
    throw error;
  }
}

/**
 * Sync salespersons from Google Sheet to Supabase
 */
export async function syncSalespersonsFromGoogleSheet(
  spreadsheetId: string,
  sheetId?: string,
) {
  try {
    const rows = await fetchGoogleSheet(spreadsheetId, sheetId);
    const salespersons = rows
      .map(parseSalespersonRow)
      .filter((person) => person.name); // Only rows with names

    // Send to backend for syncing to Supabase
    const response = await fetch("/api/sync-salespersons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        salespersons,
        source: "google_sheet",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to sync salespersons to database");
    }

    return await response.json();
  } catch (error) {
    console.error("Error syncing salespersons from Google Sheet:", error);
    throw error;
  }
}
