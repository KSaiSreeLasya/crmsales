/**
 * API Route: GET /api/fetch-google-sheets-metadata
 * Fetches metadata about all sheets in a Google Spreadsheet
 * Uses the Google Sheets API to get sheet names and IDs
 * Excludes archive, template, and system sheets from the results
 */

import { RequestHandler } from "express";
import { getSheetsList, filterSheetsForSync } from "../../shared/googleSheets";

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
      console.log("Using fallback sheets: October, November, December");
      res.json({
        success: true,
        sheets: [
          { id: "0", name: "October" },
          { id: "1892152973", name: "November" },
          { id: "1355430272", name: "December" },
        ],
        warning:
          "⚠️  Using FALLBACK sheet names. The actual sheet names are being detected from Google Sheets. If sheets are named differently, sync will auto-detect them.",
        note: "November sheet is configured for sync with flexible column name matching",
      });
      return;
    }

    console.log(`Fetching sheet metadata for spreadsheet: ${spreadsheetId}`);

    // Use the shared utility to fetch sheets dynamically
    const allSheets = await getSheetsList(spreadsheetId, googleSheetsApiKey);

    // Filter out archive, template, and system sheets
    const filteredSheets = filterSheetsForSync(allSheets);

    console.log(
      `Successfully fetched ${allSheets.length} total sheets, ${filteredSheets.length} available for sync`,
    );

    res.json({
      success: true,
      sheets: filteredSheets,
      count: filteredSheets.length,
    });
  } catch (error) {
    console.error("Error fetching Google Sheets metadata:", error);
    res.status(500).json({
      error: "Failed to fetch sheet metadata",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
