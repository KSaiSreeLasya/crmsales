/**
 * Google Sheets Integration - Shared utilities
 * Can be used by both client and server
 */

export interface GoogleSheetRow {
  [key: string]: string | number | undefined;
}

/**
 * Sanitize cell values - remove problematic characters that cause JSON encoding issues
 * Handles newlines, special Unicode characters, and invalid sequences
 */
export function sanitizeValue(value: any): string {
  if (value === null || value === undefined) return "";

  let stringValue = String(value);

  // Remove/replace problematic characters
  // 1. Replace newlines and carriage returns with spaces
  stringValue = stringValue.replace(/[\r\n\t]/g, " ");

  // 2. Remove null bytes (can cause encoding issues)
  stringValue = stringValue.replace(/\0/g, "");

  // 3. Remove control characters (ASCII 0-31, except for space which we've handled)
  stringValue = stringValue.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

  // 4. Normalize multiple spaces to single space
  stringValue = stringValue.replace(/\s+/g, " ");

  // 5. Trim whitespace
  stringValue = stringValue.trim();

  // 6. Limit length to prevent database field overflow (reasonable limit for TEXT fields)
  // Most TEXT columns should handle 65KB, but let's be conservative and limit to 10000 chars
  if (stringValue.length > 10000) {
    stringValue = stringValue.substring(0, 10000);
    console.warn("Value truncated to 10000 characters to prevent overflow");
  }

  return stringValue;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Normalize column names (case-insensitive, trim whitespace, remove quotes, handle multiple underscores)
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/^["']|["']$/g, "") // Remove leading/trailing quotes
    .replace(/[\s_]+/g, "_") // Replace all spaces and underscores with single underscore
    .replace(/[?!]/g, "") // Remove special characters like ? and !
    .replace(/-/g, ""); // Remove dashes
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
 * Expected column order:
 * A: Type of property
 * B: Monthly electricity bill
 * C: Full name
 * D: Phone
 * E: Email
 * F: Street address
 * G: Postal code
 * H: Lead status
 */
export function parseLeadRow(row: GoogleSheetRow) {
  // Create a map of normalized keys to values for flexible matching
  const columnMap: { [normalizedKey: string]: string } = {};
  const allKeys: string[] = [];

  for (const [key, value] of Object.entries(row)) {
    allKeys.push(key);
    const normalizedKey = normalizeKey(key);
    const sanitized = sanitizeValue(value);
    columnMap[normalizedKey] = sanitized;
  }

  // Helper function to find a column value by searching for key patterns
  const findColumnValue = (patterns: string[]): string => {
    // Try exact normalized matches first
    for (const pattern of patterns) {
      const normalizedPattern = normalizeKey(pattern);

      if (columnMap[normalizedPattern]) {
        return columnMap[normalizedPattern];
      }
    }

    // Try fuzzy matching with normalized keys
    for (const pattern of patterns) {
      const normalizedPattern = normalizeKey(pattern);

      for (const key in columnMap) {
        // Check if pattern appears in key or key appears in pattern
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

  // Parse columns with flexible matching
  // Including all variations with spaces, underscores, hyphens, and question marks
  const type_of_property = findColumnValue([
    "what_type_of_property_do_you_want_to_install_solar_on",
    "what_type_of_property_do_you_own",
    "what_type_of_property",
    "type_of_property",
    "property_type",
  ]);

  const avg_monthly_bill = findColumnValue([
    "what_is_your_average_monthly_electricity_bill",
    "what_is_your_current_electricity_bill",
    "average_monthly_electricity_bill",
    "current_electricity_bill",
    "monthly_electricity_bill",
    "electricity_bill",
    "monthly_bill",
    "current_bill",
  ]);

  const name = findColumnValue(["full_name", "full_name", "name"]);

  const phone = findColumnValue(["phone", "phone_no", "phone_number"]);

  const email = findColumnValue(["email", "email_address"]);

  const street_address = findColumnValue([
    "street_address",
    "street",
    "address",
  ]);

  const post_code = findColumnValue(["postal_code", "post_code", "postcode"]);

  const lead_status = findColumnValue(["lead_status", "status"]);

  // Handle feedback variations: "FEEDBACK -1", "FEEDBACK- 2", "FEEDBACK_1", "FEEDBACK-1", etc.
  const note1 = findColumnValue([
    "feedback_1",
    "feedback_1",
    "note_1",
    "notes_1",
  ]);

  const note2 = findColumnValue([
    "feedback_2",
    "feedback_2",
    "note_2",
    "notes_2",
  ]);

  const whatsappFollowUp = findColumnValue(["whatsapp_follow_up", "whatsapp"]);

  const parsed = {
    name,
    email,
    phone,
    company: "N/A",
    street_address,
    post_code,
    lead_status,
    electricity_bill: avg_monthly_bill,
    type_of_property,
    avg_monthly_bill,
    status: "Not lifted" as const,
    assignedTo: "Unassigned",
    note1: note1 || "",
    note2: note2 || "",
    whatsapp_follow_up: whatsappFollowUp || "",
  };

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

  console.log("Raw CSV first 5 lines:");
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    console.log(`  Line ${i}: ${lines[i].substring(0, 150)}`);
  }
  console.log("Initial headers from line 0:", headers);
  console.log("Initial headers count:", headers.length);

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
  console.log(`Data starts from line ${startIndex}`);

  // Parse data rows and preserve date rows
  const rows: GoogleSheetRow[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    // Skip completely empty rows
    if (trimmedLine === "") continue;

    const values = parseCSVLine(lines[i]);

    // Use all values - don't skip any columns
    const dataValues = values;

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
        const value = dataValues[index] || "";
        // Store all values, even empty ones, to preserve column structure
        row[header] = value;
      }
    });

    // Include all rows with at least one non-empty cell
    // The sync process will validate required fields (name and email)
    const nonEmptyCount = Object.values(row).filter(
      (val) => val && String(val).trim() !== "",
    ).length;

    if (nonEmptyCount > 0) {
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

/**
 * Get all sheets from a Google Spreadsheet dynamically
 * Requires GOOGLE_SHEETS_API_KEY environment variable
 * Returns metadata about all sheets (id and name)
 */
export async function getSheetsList(
  spreadsheetId: string,
  apiKey?: string,
): Promise<Array<{ id: string; name: string }>> {
  const key = apiKey || process.env.GOOGLE_SHEETS_API_KEY || "";

  if (!key) {
    throw new Error(
      "GOOGLE_SHEETS_API_KEY is required to fetch sheet metadata",
    );
  }

  try {
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${key}&fields=sheets(properties(sheetId,title))`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(
        "Failed to fetch from Google Sheets API:",
        response.status,
        response.statusText,
      );
      throw new Error(`Failed to fetch sheet metadata: ${response.statusText}`);
    }

    const data = await response.json();
    const sheets = (data.sheets || []).map((sheet: any) => ({
      id: String(sheet.properties.sheetId),
      name: sheet.properties.title,
    }));

    console.log(`[SHEETS LIST] Found ${sheets.length} total sheets`);
    sheets.forEach((sheet) => {
      console.log(`[SHEETS LIST]   - ${sheet.name} (ID: ${sheet.id})`);
    });

    return sheets;
  } catch (error) {
    console.error("Error fetching sheets list:", error);
    throw error;
  }
}

/**
 * Get sheets to sync - filters out system sheets and archives
 * Returns only sheets that should be synced for data
 */
export function filterSheetsForSync(
  sheets: Array<{ id: string; name: string }>,
): Array<{ id: string; name: string }> {
  // Exclude sheets with these patterns (case-insensitive)
  const excludePatterns = [
    /^archive/i,
    /^template/i,
    /^backup/i,
    /^\[.*\]/,
    /^_/,
  ];

  return sheets.filter((sheet) => {
    const name = sheet.name || "";
    return !excludePatterns.some((pattern) => pattern.test(name));
  });
}
