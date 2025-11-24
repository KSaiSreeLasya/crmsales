/**
 * API Route: GET /api/fetch-google-sheets-metadata
 * Fetches metadata about all sheets in a Google Spreadsheet
 * Uses the Google Sheets API to get sheet names and IDs
 */

import { RequestHandler } from "express";

interface SheetMetadata {
  id: string;
  name: string;
}

export const handleFetchGoogleSheetsMetadata: RequestHandler = async (
  req,
  res,
) => {
  try {
    const { spreadsheetId } = req.query;

    if (!spreadsheetId || typeof spreadsheetId !== "string") {
      res.status(400).json({ error: "spreadsheetId is required" });
      return;
    }

    const googleSheetsApiKey = process.env.GOOGLE_SHEETS_API_KEY;

    if (!googleSheetsApiKey) {
      console.warn(
        "GOOGLE_SHEETS_API_KEY not configured, using fallback method",
      );
      // Return hardcoded sheets if API key is not available
      // This is a fallback - user will need to add API key for dynamic sheet detection
      res.json({
        success: true,
        sheets: [
          { id: "0", name: "Hyderabad Leads" },
          { id: "1892152973", name: "November" },
        ],
        warning:
          "Using fallback sheets - set GOOGLE_SHEETS_API_KEY for auto-detection",
      });
      return;
    }

    console.log(`Fetching sheet metadata for spreadsheet: ${spreadsheetId}`);

    // Fetch sheet metadata using Google Sheets API
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${googleSheetsApiKey}&fields=sheets(properties(sheetId,title))`;

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
    const sheets: SheetMetadata[] = (data.sheets || []).map((sheet: any) => ({
      id: String(sheet.properties.sheetId),
      name: sheet.properties.title,
    }));

    console.log(`Successfully fetched ${sheets.length} sheets`);
    sheets.forEach((sheet) => {
      console.log(`  - Sheet: ${sheet.name} (ID: ${sheet.id})`);
    });

    res.json({
      success: true,
      sheets: sheets,
      count: sheets.length,
    });
  } catch (error) {
    console.error("Error fetching Google Sheets metadata:", error);
    res.status(500).json({
      error: "Failed to fetch sheet metadata",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
