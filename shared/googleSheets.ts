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
 * Handles exact column names from the sheet
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
  let note1 = "";
  let note2 = "";

  // Normalize all keys to lowercase for matching
  const normalizedRow: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase().trim();
    normalizedRow[normalizedKey] = String(value || "").trim();
  }

  // Direct exact matches first (most reliable)
  if (normalizedRow["full name"]) name = normalizedRow["full name"];
  if (normalizedRow["email"]) email = normalizedRow["email"];
  if (normalizedRow["phone"]) phone = normalizedRow["phone"];
  if (normalizedRow["street address"])
    street_address = normalizedRow["street address"];
  if (normalizedRow["street_address"])
    street_address = normalizedRow["street_address"];
  if (normalizedRow["post code"]) post_code = normalizedRow["post code"];
  if (normalizedRow["post_code"]) post_code = normalizedRow["post_code"];
  if (normalizedRow["lead status"]) lead_status = normalizedRow["lead status"];
  if (normalizedRow["lead_status"]) lead_status = normalizedRow["lead_status"];
  if (normalizedRow["note1"]) note1 = normalizedRow["note1"];
  if (normalizedRow["note 1"]) note1 = normalizedRow["note 1"];
  if (normalizedRow["note2"]) note2 = normalizedRow["note2"];
  if (normalizedRow["note 2"]) note2 = normalizedRow["note 2"];
  if (normalizedRow["electricity bill"])
    electricity_bill = normalizedRow["electricity bill"];
  if (normalizedRow["electricity_bill"])
    electricity_bill = normalizedRow["electricity_bill"];

  // Fallback: intelligent matching for any remaining empty fields
  for (const [key, value] of Object.entries(normalizedRow)) {
    if (!value) continue;

    // Skip header-like keys
    if (key === "" || key.includes("?")) continue;

    // Match full name variants
    if (!name && (key.includes("full") || key.includes("name"))) {
      name = value;
    }

    // Match email variants
    if (!email && key.includes("email")) {
      email = value;
    }

    // Match phone variants
    if (!phone && (key.includes("phone") || key.includes("telephone"))) {
      phone = value;
    }

    // Match street address variants
    if (
      !street_address &&
      (key.includes("street") || key.includes("address"))
    ) {
      street_address = value;
    }

    // Match post code variants
    if (
      !post_code &&
      (key.includes("post") ||
        key.includes("zip") ||
        key.includes("postal") ||
        (key.includes("code") && !key.includes("postcode")))
    ) {
      post_code = value;
    }

    // Match lead status variants
    if (!lead_status && (key.includes("lead") || key.includes("status"))) {
      lead_status = value;
    }

    // Match electricity bill variants
    if (
      !electricity_bill &&
      (key.includes("electricity") || key.includes("bill"))
    ) {
      electricity_bill = value;
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
    note1: note1 || "",
    note2: note2 || "",
  };

  if (name && email) {
    console.log("✓ Valid lead found:", { name, email, phone });
  } else {
    console.log("✗ Invalid lead (missing name or email):");
    console.log(
      "  Available fields:",
      Object.keys(normalizedRow).filter((k) => normalizedRow[k]),
    );
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

  // Parse first line as potential header
  let headers = parseCSVLine(lines[0]);
  let startIndex = 1;

  console.log("Raw CSV first 3 lines:");
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    console.log(`  Line ${i}: ${lines[i].substring(0, 100)}`);
  }
  console.log("Initial headers:", headers);

  // If headers look like data (contain underscores or short values), look for real headers
  const headerLooksLikeData = headers.some((h) =>
    String(h)
      .toLowerCase()
      .match(/^(_|what_|to_|solar|electricity|bill|^\d+$)/),
  );

  if (headerLooksLikeData) {
    console.log("First row appears to be data, searching for header row...");

    // Find a row that contains email, phone, AND name - these must all be present
    for (let i = 0; i < Math.min(50, lines.length); i++) {
      const possibleHeaders = parseCSVLine(lines[i]);
      const headerTextLower = possibleHeaders
        .map((h) => h.toLowerCase())
        .join("|");

      // Check for the essential columns together
      const hasEmailColumn = headerTextLower.includes("email");
      const hasPhoneColumn = headerTextLower.includes("phone");
      const hasNameColumn =
        headerTextLower.includes("name") || headerTextLower.includes("full");

      if (hasEmailColumn && hasPhoneColumn && hasNameColumn) {
        console.log(`✓ Found valid header row at line ${i}:`, possibleHeaders);
        headers = possibleHeaders;
        startIndex = i + 1;
        break;
      }
    }
  }

  console.log("CSV Headers count:", headers.length);
  console.log("CSV Headers:", headers);

  // Detect if first column is malformed (very long header or garbage)
  let skipFirstColumn = false;
  if (headers.length > 0) {
    const firstHeader = headers[0];
    // If first column header is very long or contains question marks, it's likely malformed
    if ((firstHeader && firstHeader.length > 50) || firstHeader.includes("?")) {
      console.log("First column appears malformed, will skip it");
      skipFirstColumn = true;
      // Remove the first malformed header
      headers = headers.slice(1);
    }
  }

  console.log("Final headers after cleanup:", headers);
  console.log(`Data starts from line ${startIndex}`);

  // Parse data rows
  const rows: GoogleSheetRow[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;

    const values = parseCSVLine(lines[i]);

    // Skip first value if first column was malformed
    const dataValues = skipFirstColumn ? values.slice(1) : values;

    const row: GoogleSheetRow = {};

    headers.forEach((header, index) => {
      if (header && header.trim()) {
        row[header] = dataValues[index] || "";
      }
    });

    // Only add row if it has at least one non-empty cell
    if (Object.values(row).some((val) => val && String(val).trim())) {
      rows.push(row);
    }
  }

  console.log("Total parsed data rows:", rows.length);
  if (rows.length > 0) {
    console.log("First data row:", rows[0]);
    console.log("First data row keys:", Object.keys(rows[0]));
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
      console.error(
        "Initial fetch failed, trying alternative method:",
        fetchError,
      );
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
