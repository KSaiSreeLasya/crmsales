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
 * Normalize column names (case-insensitive, trim whitespace)
 */
function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
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
      if (normalizeKey(key) === normalizedName && value) {
        return String(value).trim();
      }
    }
  }
  return "";
}

/**
 * Parse Google Sheet lead row into Lead format
 * Expected columns: Name, Email, Company, Phone, Assigned to, Status, Note1, Note2
 */
export function parseLeadRow(row: GoogleSheetRow) {
  return {
    name: getColumnValue(row, "Name"),
    email: getColumnValue(row, "Email"),
    phone: getColumnValue(row, "Phone"),
    company: getColumnValue(row, "Company"),
    status: (getColumnValue(row, "Status") || "Not lifted") as LeadStatus,
    assignedTo: getColumnValue(row, "Assigned to", "Assigned To"),
    note1: getColumnValue(row, "Note1", "Note 1"),
    note2: getColumnValue(row, "Note2", "Note 2"),
  };
}

/**
 * Parse Google Sheet salesperson row into Salesperson format
 * Expected columns: Name, Email, Phone, Department, Region
 */
export function parseSalespersonRow(row: GoogleSheetRow) {
  return {
    name: getColumnValue(row, "Name"),
    email: getColumnValue(row, "Email"),
    phone: getColumnValue(row, "Phone"),
    department: getColumnValue(row, "Department"),
    region: getColumnValue(row, "Region"),
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

  // Parse data rows, skip empty rows
  const rows: GoogleSheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;

    const values = parseCSVLine(lines[i]);
    const row: GoogleSheetRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    // Only add row if it has at least one non-empty cell
    if (Object.values(row).some((val) => val && String(val).trim())) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Parse a single CSV line (handles quoted values)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quotes
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
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
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
    }

    const csv = await response.text();
    return parseCsv(csv);
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
    const leads = rows.map(parseLeadRow).filter((lead) => lead.name); // Only rows with names

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

    if (!response.ok) {
      throw new Error("Failed to sync leads to database");
    }

    return await response.json();
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
