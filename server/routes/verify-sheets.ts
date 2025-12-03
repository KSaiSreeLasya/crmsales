/**
 * API Route: GET /api/verify-sheets
 * Verifies Google Sheets configuration and tests connectivity
 * Automatically discovers all sheets from the spreadsheet
 */

import { RequestHandler } from "express";
import {
  fetchGoogleSheet,
  getSheetsList,
  filterSheetsForSync,
} from "../../shared/googleSheets";

interface SheetVerification {
  name: string;
  id: string;
  accessible: boolean;
  rowCount: number;
  error?: string;
  sampleColumns?: string[];
}

interface VerificationResult {
  spreadsheetId: string;
  timestamp: string;
  sheets: SheetVerification[];
  summary: {
    total: number;
    accessible: number;
    failed: number;
  };
  allSheetsOk: boolean;
  message: string;
}

export const handleVerifySheets: RequestHandler = async (req, res) => {
  try {
    const { spreadsheetId } = req.query;

    // Default to the primary spreadsheet ID if not provided
    const sheetId =
      (spreadsheetId as string) ||
      "1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM";

    const result: VerificationResult = {
      spreadsheetId: sheetId,
      timestamp: new Date().toISOString(),
      sheets: [],
      summary: {
        total: SHEETS_TO_VERIFY.length,
        accessible: 0,
        failed: 0,
      },
      allSheetsOk: false,
      message: "",
    };

    console.log(`[VERIFY] Starting sheet verification for: ${sheetId}`);
    console.log(`[VERIFY] Testing ${SHEETS_TO_VERIFY.length} sheets...`);

    // Test each sheet
    for (const sheet of SHEETS_TO_VERIFY) {
      const verification: SheetVerification = {
        name: sheet.name,
        id: sheet.id,
        accessible: false,
        rowCount: 0,
      };

      try {
        console.log(`[VERIFY] Testing ${sheet.name} (ID: ${sheet.id})...`);

        const rows = await fetchGoogleSheet(sheetId, sheet.id);

        verification.accessible = true;
        verification.rowCount = rows.length;
        result.summary.accessible++;

        if (rows.length > 0) {
          verification.sampleColumns = Object.keys(rows[0]).slice(0, 5);
          console.log(
            `[VERIFY] ✓ ${sheet.name}: ${rows.length} rows, columns: ${verification.sampleColumns.join(", ")}`,
          );
        } else {
          console.warn(`[VERIFY] ⚠ ${sheet.name}: No rows found`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        verification.error = errorMsg;
        result.summary.failed++;
        console.error(
          `[VERIFY] ✗ ${sheet.name} (ID: ${sheet.id}): ${errorMsg}`,
        );
      }

      result.sheets.push(verification);
    }

    // Determine if all sheets are accessible
    result.allSheetsOk = result.summary.failed === 0;

    if (result.allSheetsOk) {
      result.message = `✓ All ${result.summary.accessible} sheets are accessible and properly configured`;
    } else if (result.summary.accessible > 0) {
      result.message = `⚠ ${result.summary.accessible}/${result.summary.total} sheets accessible. ${result.summary.failed} sheet(s) failed - check sheet IDs`;
    } else {
      result.message = `✗ All sheets failed to load. Verify spreadsheet ID and sheet IDs are correct`;
    }

    console.log(`[VERIFY] ${result.message}`);

    const statusCode = result.allSheetsOk ? 200 : 207; // 207 Multi-Status for partial success
    return res.status(statusCode).json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[VERIFY] Error during verification:", errorMsg);
    return res.status(500).json({
      error: "Verification failed",
      message: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }
};
