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
 * Expected columns: Type of Property, Avg Monthly Bill, Full Name, Phone, Email, Address, Postal Code, Lead Status, Note 1, Note 2
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
  let type_of_property = "";
  let avg_monthly_bill = "";
  let note1 = "";
  let note2 = "";

  // Create a map of normalized keys to original values for matching
  const columnMap: { [normalizedKey: string]: string } = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/^["']|["']$/g, "");
    const trimmedValue = String(value || "").trim();
    columnMap[normalizedKey] = trimmedValue;
  }

  // Helper function to find a column value by patterns
  const findColumnValue = (patterns: string[]): string => {
    for (const pattern of patterns) {
      const normalizedPattern = pattern
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_");
      if (columnMap[normalizedPattern] && columnMap[normalizedPattern]) {
        return columnMap[normalizedPattern];
      }

      // Also try partial matching for flexible columns
      for (const key in columnMap) {
        if (
          key.includes(normalizedPattern) ||
          normalizedPattern.includes(key)
        ) {
          const value = columnMap[key];
          if (value) {
            return value;
          }
        }
      }
    }
    return "";
  };

  // Parse each column with multiple possible names
  type_of_property = findColumnValue([
    "type_of_property",
    "type of property",
    "property_type",
  ]);

  avg_monthly_bill = findColumnValue([
    "avg_monthly_bill",
    "avg monthly bill",
    "monthly_bill",
    "average_monthly_bill",
  ]);

  name = findColumnValue([
    "full_name",
    "full name",
    "name",
    "full_name",
  ]);

  phone = findColumnValue([
    "phone",
    "phone_no",
    "phone no",
    "phone_number",
    "telephone",
    "mobile",
  ]);

  email = findColumnValue([
    "email",
    "email_address",
  ]);

  street_address = findColumnValue([
    "street_address",
    "street address",
    "address",
    "street",
  ]);

  post_code = findColumnValue([
    "postal_code",
    "postal code",
    "post_code",
    "postcode",
    "zip_code",
    "zip",
  ]);

  lead_status = findColumnValue([
    "lead_status",
    "lead status",
    "status",
  ]);

  electricity_bill = findColumnValue([
    "electricity_bill",
    "electricity bill",
    "electric_bill",
  ]);

  note1 = findColumnValue([
    "note_1",
    "note 1",
    "note1",
    "notes_1",
  ]);

  note2 = findColumnValue([
    "note_2",
    "note 2",
    "note2",
    "notes_2",
  ]);

  const parsed = {
    name,
    email,
    phone,
    company,
    street_address,
    post_code,
    lead_status,
    electricity_bill,
    type_of_property,
    avg_monthly_bill,
    status: "Not lifted",
    assignedTo: "Unassigned",
    note1: note1 || "",
    note2: note2 || "",
  };

  if (name && email) {
    console.log("✓ Valid lead found:", {
      name,
      email,
      phone,
      type_of_property,
      avg_monthly_bill,
    });
  } else {
    console.log("✗ Invalid lead (missing name or email):");
    console.log(
      "  Available fields:",
      Object.keys(columnMap).filter((k) => columnMap[k]),
    );
    console.log("  Parsed values:", parsed);
  }

  return parsed;
}

/**
 * Parse Google Sheet row with all columns preserved (dynamic sync)
 * Preserves exact column names from the sheet
 */
export function parseRowDynamic(row: GoogleSheetRow): GoogleSheetRow {
  // Return all columns as-is, trimming values
  const result: GoogleSheetRow = {};
  for (const [key, value] of Object.entries(row)) {
    const trimmedKey = key.trim();
    const trimmedValue =
      value === undefined || value === null ? "" : String(value).trim();
    if (trimmedKey) {
      result[trimmedKey] = trimmedValue;
    }
  }
  return result;
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
 * Check if a string is a date in format YYYY-MM-DD
 */
function isDateRow(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

/**
 * Parse CSV content into rows, preserving date rows as separators
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
    // If first column header is very long or contains question marks, it's likely a form-style header
    if ((firstHeader && firstHeader.length > 50) || firstHeader.includes("?")) {
      console.log(
        "First column appears malformed (possibly form-style), will skip it",
      );
      skipFirstColumn = true;
      // Remove the first malformed header
      headers = headers.slice(1);
    }
  }

  console.log("Final headers after cleanup:", headers);
  console.log("Skip first column:", skipFirstColumn);
  console.log(`Data starts from line ${startIndex}`);

  // Parse data rows and preserve date rows
  const rows: GoogleSheetRow[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    // Skip completely empty rows
    if (trimmedLine === "") continue;

    const values = parseCSVLine(lines[i]);

    // Skip first value if first column was malformed
    const dataValues = skipFirstColumn ? values.slice(1) : values;

    // Check if this is a date row (first non-empty value is a date)
    const firstValue = dataValues.find((v) => v && String(v).trim() !== "");
    if (firstValue && isDateRow(String(firstValue))) {
      // This is a date row - preserve it as a special row
      const dateRow: GoogleSheetRow = {
        _isDateRow: "true",
        _dateValue: String(firstValue).trim(),
      };
      rows.push(dateRow);
      console.log("✓ Found date row:", String(firstValue).trim());
      continue;
    }

    const row: GoogleSheetRow = {};

    headers.forEach((header, index) => {
      if (header && header.trim()) {
        row[header] = dataValues[index] || "";
      }
    });

    // Count non-empty cells
    const nonEmptyCount = Object.values(row).filter(
      (val) => val && String(val).trim() !== "",
    ).length;

    // Only add row if it has at least one non-empty cell AND at least 2 fields populated
    // This filters out completely empty rows and sparse rows
    if (nonEmptyCount >= 2) {
      rows.push(row);
    }
  }

  console.log("Total parsed data rows:", rows.length);
  if (rows.length > 0) {
    console.log("First data row:", rows[0]);
    console.log("First data row keys:", Object.keys(rows[0]));
    console.log("Sample rows:", rows.slice(0, 3));
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
