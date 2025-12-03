/**
 * API Route: POST /api/test-sync-all-sheets
 * Tests syncing all sheets (October, November, December) without saving to database
 * Useful for verification and debugging sheet configuration
 */

import { RequestHandler } from "express";
import { fetchGoogleSheet, parseRowDynamic } from "../../shared/googleSheets";

interface SheetTestResult {
  name: string;
  sheetId: string;
  success: boolean;
  totalRows: number;
  validLeads: number;
  invalidRows: number;
  dateRows: number;
  columns?: string[];
  sampleLeads?: any[];
  error?: string;
}

interface TestAllSheetsResult {
  spreadsheetId: string;
  timestamp: string;
  dryRun: boolean;
  sheets: SheetTestResult[];
  summary: {
    totalSheets: number;
    successfulSheets: number;
    failedSheets: number;
    totalLeadsFound: number;
    totalValidLeads: number;
  };
  allSheetsOk: boolean;
  message: string;
}

const SHEETS_TO_TEST = [
  { id: "0", name: "October" },
  { id: "1892152973", name: "November" },
  { id: "1355430272", name: "december" },
];

const validateLead = (lead: any): boolean => {
  const nameValue = lead.name || lead.Name || lead.full_name || lead.Full_Name;
  const emailValue =
    lead.email || lead.Email || lead.email_address || lead.Email_Address;

  // Name and email are required (phone is optional for consistency)
  return (
    nameValue &&
    String(nameValue).trim().length > 0 &&
    emailValue &&
    String(emailValue).trim().length > 0
  );
};

export const handleTestSyncAllSheets: RequestHandler = async (req, res) => {
  try {
    const { spreadsheetId, dryRun } = req.query;

    const sheetId =
      (spreadsheetId as string) ||
      "1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM";
    const isDryRun = dryRun !== "false"; // Default to true (dry run)

    const result: TestAllSheetsResult = {
      spreadsheetId: sheetId,
      timestamp: new Date().toISOString(),
      dryRun: isDryRun,
      sheets: [],
      summary: {
        totalSheets: SHEETS_TO_TEST.length,
        successfulSheets: 0,
        failedSheets: 0,
        totalLeadsFound: 0,
        totalValidLeads: 0,
      },
      allSheetsOk: false,
      message: "",
    };

    console.log(`[TEST SYNC] Starting test sync for all sheets...`);
    console.log(`[TEST SYNC] Spreadsheet ID: ${sheetId}`);
    console.log(`[TEST SYNC] Dry run: ${isDryRun}`);

    // Test each sheet
    for (const sheet of SHEETS_TO_TEST) {
      const testResult: SheetTestResult = {
        name: sheet.name,
        sheetId: sheet.id,
        success: false,
        totalRows: 0,
        validLeads: 0,
        invalidRows: 0,
        dateRows: 0,
      };

      try {
        console.log(`[TEST SYNC] Testing ${sheet.name} (ID: ${sheet.id})...`);

        // Fetch the sheet data
        const rows = await fetchGoogleSheet(sheetId, sheet.id);
        testResult.totalRows = rows.length;
        console.log(
          `[TEST SYNC] ✓ Fetched ${rows.length} rows from ${sheet.name}`,
        );

        if (rows.length === 0) {
          console.warn(`[TEST SYNC] ⚠ ${sheet.name} is empty`);
          testResult.success = true;
          result.summary.successfulSheets++;
        } else {
          // Get columns from first row
          testResult.columns = Object.keys(rows[0]).slice(0, 10);

          // Filter and validate leads
          const dateRows = rows.filter((row) => {
            return row._isDateRow === "true" || row._isDateRow === true;
          });
          testResult.dateRows = dateRows.length;

          const dataRows = rows.filter((row) => {
            return !(row._isDateRow === "true" || row._isDateRow === true);
          });

          const validLeads = dataRows.filter((row) => validateLead(row));
          const invalidRows = dataRows.length - validLeads.length;

          testResult.validLeads = validLeads.length;
          testResult.invalidRows = invalidRows;

          // Get sample leads for display
          testResult.sampleLeads = validLeads.slice(0, 2).map((lead) => ({
            name:
              lead.name ||
              lead.Name ||
              lead.full_name ||
              lead.Full_Name ||
              "N/A",
            email:
              lead.email ||
              lead.Email ||
              lead.email_address ||
              lead.Email_Address ||
              "N/A",
            phone:
              lead.phone ||
              lead.Phone ||
              lead.phone_no ||
              lead.Phone_No ||
              lead.contact ||
              lead.Contact ||
              "(optional)",
          }));

          testResult.success = true;
          result.summary.successfulSheets++;
          result.summary.totalLeadsFound += testResult.totalRows;
          result.summary.totalValidLeads += validLeads.length;

          console.log(
            `[TEST SYNC] ✓ ${sheet.name}: ${validLeads.length} valid leads (${invalidRows} invalid rows, ${dateRows.length} date rows)`,
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        testResult.error = errorMsg;
        result.summary.failedSheets++;
        console.error(
          `[TEST SYNC] ✗ ${sheet.name} (ID: ${sheet.id}): ${errorMsg}`,
        );
      }

      result.sheets.push(testResult);
    }

    // Determine overall status
    result.allSheetsOk = result.summary.failedSheets === 0;

    if (result.allSheetsOk) {
      result.message = `✓ All ${result.summary.successfulSheets} sheets tested successfully. Found ${result.summary.totalValidLeads} valid leads ready for sync.`;
    } else if (result.summary.successfulSheets > 0) {
      result.message = `⚠ ${result.summary.successfulSheets}/${result.summary.totalSheets} sheets successful. ${result.summary.failedSheets} sheet(s) failed - check sheet IDs and Google Sheets API configuration.`;
    } else {
      result.message = `✗ All sheets failed. Verify spreadsheet ID and sheet IDs are correct. Check that GOOGLE_SHEETS_API_KEY is configured.`;
    }

    console.log(`[TEST SYNC] ${result.message}`);

    const statusCode = result.allSheetsOk ? 200 : 207; // 207 Multi-Status for partial success
    return res.status(statusCode).json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[TEST SYNC] Error during test:", errorMsg);
    return res.status(500).json({
      error: "Test sync failed",
      message: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }
};
