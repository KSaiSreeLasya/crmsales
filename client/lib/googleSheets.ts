/**
 * Google Sheets Integration
 * Utilities to sync leads from Google Sheets to Supabase
 * 
 * TODO: Set up environment variable:
 * - VITE_GOOGLE_SHEETS_API_KEY: Your Google Sheets API key
 */

export interface GoogleSheetRow {
  [key: string]: string | number | undefined;
}

/**
 * Parse Google Sheet data into Lead format
 * Expected columns: Name, Email, Phone, Company, Status
 */
export function parseGoogleSheetRow(row: GoogleSheetRow) {
  return {
    name: (row.Name || row.name || "") as string,
    email: (row.Email || row.email || "") as string,
    phone: (row.Phone || row.phone || "") as string,
    company: (row.Company || row.company || "") as string,
    status: ((row.Status || row.status || "new") as string).toLowerCase() as
      | "new"
      | "contacted"
      | "qualified"
      | "converted"
      | "lost",
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
export function getGoogleSheetsCsvUrl(spreadsheetId: string, sheetId: string = "0"): string {
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

  // Parse data rows
  const rows: GoogleSheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;

    const values = parseCSVLine(lines[i]);
    const row: GoogleSheetRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    rows.push(row);
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
  sheetId?: string
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
  sheetId?: string
) {
  try {
    const rows = await fetchGoogleSheet(spreadsheetId, sheetId);
    const leads = rows.map(parseGoogleSheetRow);

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
