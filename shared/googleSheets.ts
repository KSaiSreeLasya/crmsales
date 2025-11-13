/**
 * Google Sheets Integration - Shared utilities
 * Can be used by both client and server
 */

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
        const result = String(value)
          .trim()
          .replace(/^["']|["']$/g, "");
        if (result) return result;
      }
    }
  }
  return "";
}

/**
 * Parse Google Sheet lead row into Lead format
 */
export function parseLeadRow(row: GoogleSheetRow) {
  let name = "";
  let email = "";
  let phone = "";
  let company = "N/A";
  let street_address = "";
  let post_code = "";
  let lead_status = "";
  let electricity_bill = "";

  // Iterate through all columns and match them intelligently
  for (const [key, value] of Object.entries(row)) {
    if (!value) continue;

    const keyLower = key.toLowerCase();
    const valueTrimmed = String(value).trim();

    // Match name (full name, fname, etc.)
    if (!name && (keyLower.includes("name") || keyLower.includes("fname"))) {
      name = valueTrimmed;
    }

    // Match email
    if (!email && keyLower.includes("email")) {
      email = valueTrimmed;
    }

    // Match phone
    if (
      !phone &&
      (keyLower.includes("phone") || keyLower.includes("telephone"))
    ) {
      phone = valueTrimmed;
    }

    // Match property type
    if (
      company === "N/A" &&
      (keyLower.includes("property") || keyLower.includes("install"))
    ) {
      company = valueTrimmed || "N/A";
    }

    // Match street address
    if (
      !street_address &&
      (keyLower.includes("street") || keyLower.includes("address"))
    ) {
      street_address = valueTrimmed;
    }

    // Match post code
    if (
      !post_code &&
      (keyLower.includes("post") ||
        keyLower.includes("zip") ||
        keyLower.includes("postal"))
    ) {
      post_code = valueTrimmed;
    }

    // Match lead status
    if (
      !lead_status &&
      (keyLower.includes("lead") || keyLower.includes("status"))
    ) {
      lead_status = valueTrimmed;
    }

    // Match electricity bill
    if (
      !electricity_bill &&
      (keyLower.includes("electricity") || keyLower.includes("bill"))
    ) {
      electricity_bill = valueTrimmed;
    }
  }

  const parsed = {
    name,
    email,
    phone,
    company,
    street_address,
    post_code,
    lead_status,
    electricity_bill,
    status: "Not lifted",
    assignedTo: "Unassigned",
    note1: "",
    note2: "",
  };

  if (name && email) {
    console.log("✓ Valid lead found:", { name, email, phone });
  } else {
    console.log("✗ Invalid lead (missing name or email):", parsed);
  }

  return parsed;
}

/**
 * Parse Google Sheet salesperson row into Salesperson format
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
 */
export async function fetchGoogleSheet(
  spreadsheetId: string,
  sheetId?: string,
): Promise<GoogleSheetRow[]> {
  try {
    const url = getGoogleSheetsCsvUrl(spreadsheetId, sheetId || "0");
    console.log("Fetching Google Sheet from:", url);

    // Use a fetch wrapper that handles redirects properly
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
    } catch (fetchError) {
      console.error("Initial fetch failed, trying alternative method:", fetchError);
      // If running on server, use node-fetch with redirect support
      if (typeof globalThis !== "undefined" && !globalThis.fetch) {
        throw new Error("Fetch is not available in this environment");
      }
      throw fetchError;
    }

    if (!response.ok) {
      console.error(
        "Google Sheets fetch failed:",
        response.status,
        response.statusText,
      );
      throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
    }

    const csv = await response.text();
    console.log("Raw CSV data length:", csv.length);
    const rows = parseCsv(csv);
    console.log("Parsed rows count:", rows.length);

    return rows;
  } catch (error) {
    console.error("Error fetching Google Sheet:", error);
    throw error;
  }
}
