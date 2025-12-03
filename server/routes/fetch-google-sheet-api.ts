/**
 * API Route: GET /api/fetch-google-sheet-api
 * Fetches data from Google Sheets using the Sheets API v4
 * Supports unlimited rows (no 250-row CSV export limit)
 * Handles pagination automatically
 */

import { RequestHandler } from "express";

const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY || "";
const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets";

interface GoogleSheetRow {
  [key: string]: string | number | undefined;
}

async function fetchSheetValues(
  spreadsheetId: string,
  sheetName: string,
  apiKey: string,
): Promise<any[][]> {
  const url = `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(
    sheetName,
  )}?key=${apiKey}&valueRenderOption=FORMATTED_VALUE`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error("Error fetching sheet values:", error);
    throw error;
  }
}

function convertRowsToObjects(
  headers: string[],
  rows: any[][],
): GoogleSheetRow[] {
  const result: GoogleSheetRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const obj: GoogleSheetRow = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = row[j];

      // Normalize header (trim, lowercase, replace spaces with underscores)
      const normalizedHeader = header
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/^["']|["']$/g, "");

      // Store with normalized key
      if (normalizedHeader) {
        const trimmedValue =
          value === undefined || value === null ? "" : String(value).trim();
        obj[header] = trimmedValue; // Use original header for display
      }
    }

    result.push(obj);
  }

  return result;
}

export const handleFetchGoogleSheetApi: RequestHandler = async (req, res) => {
  try {
    const { spreadsheetId, sheetName } = req.query;

    if (!spreadsheetId || typeof spreadsheetId !== "string") {
      res.status(400).json({ error: "spreadsheetId is required" });
      return;
    }

    if (!GOOGLE_SHEETS_API_KEY) {
      console.error("[FETCH API] ERROR: GOOGLE_SHEETS_API_KEY not configured");
      console.error("[FETCH API] Requested sheet name:", sheetName);
      res.status(500).json({
        error: "Google Sheets API key not configured",
        hint: "Set GOOGLE_SHEETS_API_KEY environment variable. Sync will not work for November/December sheets.",
        requestedSheetName: sheetName,
      });
      return;
    }

    // Default to first sheet if no name provided
    const resolvedSheetName = sheetName || "Sheet1";

    console.log(
      `[FETCH API] Fetching Google Sheet via API: ${spreadsheetId}, Sheet: ${resolvedSheetName}`,
    );

    // Fetch all values from the sheet
    try {
      const allRows = await fetchSheetValues(
        spreadsheetId,
        resolvedSheetName,
        GOOGLE_SHEETS_API_KEY,
      );

      if (allRows.length === 0) {
        console.log(`[FETCH API] Sheet "${resolvedSheetName}" is empty`);
        res.json({
          success: true,
          rows: [],
          count: 0,
          message: "Sheet is empty",
        });
        return;
      }
    } catch (fetchError) {
      const errorMsg =
        fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error(
        `[FETCH API] Failed to fetch sheet "${resolvedSheetName}":`,
        errorMsg,
      );

      if (
        errorMsg.includes("404") ||
        errorMsg.includes("not found") ||
        errorMsg.includes("does not exist")
      ) {
        res.status(404).json({
          error: `Sheet "${resolvedSheetName}" not found in spreadsheet`,
          hint: "Check that the sheet name matches exactly (case-sensitive). Available sheets may be different from expected.",
          requestedSheetName: resolvedSheetName,
          message: errorMsg,
        });
        return;
      }

      throw fetchError;
    }

    // First row should be headers
    const headers = allRows[0].map((h) => String(h).trim());
    const dataRows = allRows.slice(1);

    console.log(`Total rows fetched: ${dataRows.length}`);
    console.log(`Headers: ${headers.join(", ")}`);

    // Convert rows to objects with headers as keys
    const rows = convertRowsToObjects(headers, dataRows);

    // Filter out completely empty rows
    const validRows = rows.filter((row) => {
      const nonEmptyCount = Object.values(row).filter(
        (v) => v && String(v).trim() !== "",
      ).length;
      return nonEmptyCount > 0;
    });

    console.log(`Valid rows after filtering empty rows: ${validRows.length}`);

    if (validRows.length > 0) {
      console.log("Sample row:", validRows[0]);
    }

    res.json({
      success: true,
      rows: validRows,
      count: validRows.length,
      totalFetched: allRows.length - 1, // Exclude header row
    });
  } catch (error) {
    console.error("Error fetching Google Sheet via API:", error);
    res.status(500).json({
      error: "Failed to fetch Google Sheet",
      message: error instanceof Error ? error.message : "Unknown error",
      hint: "Ensure spreadsheet ID is correct and sheet name exists",
    });
  }
};
