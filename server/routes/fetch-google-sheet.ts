/**
 * API Route: GET /api/fetch-google-sheet
 * Fetches data from Google Sheets CSV export endpoint
 * This endpoint runs on the server to avoid CORS issues
 */

import { RequestHandler } from "express";
import { fetchGoogleSheet } from "../../shared/googleSheets";

export const handleFetchGoogleSheet: RequestHandler = async (req, res) => {
  try {
    const { spreadsheetId, sheetId } = req.query;

    if (!spreadsheetId || typeof spreadsheetId !== "string") {
      res.status(400).json({ error: "spreadsheetId is required" });
      return;
    }

    console.log(`Fetching Google Sheet: ${spreadsheetId}, sheetId: ${sheetId}`);

    const rows = await fetchGoogleSheet(
      spreadsheetId,
      (sheetId as string) || "0",
    );

    console.log(`Successfully fetched ${rows.length} rows from Google Sheet`);

    res.json({
      success: true,
      rows: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error("Error fetching Google Sheet:", error);
    res.status(500).json({
      error: "Failed to fetch Google Sheet",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
