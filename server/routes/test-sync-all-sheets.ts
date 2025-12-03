/**
 * API Route: POST /api/test-sync-all-sheets
 * Tests syncing all sheets without saving to database
 * Automatically discovers all sheets from Google Sheets
 * Useful for verification and debugging sheet configuration
 */

import { RequestHandler } from "express";
import {
  fetchGoogleSheet,
  parseRowDynamic,
  getSheetsList,
  filterSheetsForSync,
} from "../../shared/googleSheets";

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

const validateLead = (lead: any): boolean => {
  // Use flexible name matching to handle all column name variations
  let nameValue = "";
  let emailValue = "";

  for (const [key, value] of Object.entries(lead)) {
    const strValue = String(value || "").trim();
    if (!strValue) continue;

    const normalizedKey = key
      .toLowerCase()
      .replace(/[\s_]+/g, "_")
      .replace(/[-–!?]/g, "");

    // Match name column
    if (
      !nameValue &&
      ((normalizedKey.includes("full") && normalizedKey.includes("name")) ||
        normalizedKey === "name")
    ) {
      nameValue = strValue;
    }

    // Match email column
    if (
      !emailValue &&
      (normalizedKey.includes("email") || normalizedKey.includes("mail"))
    ) {
      emailValue = strValue;
    }
  }

  // Name and email are required (phone is optional for consistency)
  return (
    nameValue &&
    nameValue.length > 0 &&
    emailValue &&
    emailValue.length > 0
  );
};

export const handleTestSyncAllSheets: RequestHandler = async (req, res) => {
  try {
    const { spreadsheetId, dryRun } = req.query;

    const sheetId =
      (spreadsheetId as string) ||
      "1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM";
    const isDryRun = dryRun !== "false"; // Default to true (dry run)

    console.log(`[TEST SYNC] Starting test sync for all sheets...`);
    console.log(`[TEST SYNC] Spreadsheet ID: ${sheetId}`);
    console.log(`[TEST SYNC] Dry run: ${isDryRun}`);

    // Dynamically fetch sheets from the spreadsheet
    let sheetsToTest: Array<{ id: string; name: string }>;
    try {
      const allSheets = await getSheetsList(sheetId);
      sheetsToTest = filterSheetsForSync(allSheets);
      console.log(
        `[TEST SYNC] Found ${sheetsToTest.length} sheets to test: ${sheetsToTest.map((s) => s.name).join(", ")}`,
      );
    } catch (error) {
      console.warn(
        "[TEST SYNC] Failed to fetch sheets dynamically, falling back to default sheets",
        error,
      );
      // Fallback to default sheets if dynamic fetch fails
      sheetsToTest = [
        { id: "0", name: "October" },
        { id: "1892152973", name: "November" },
        { id: "1355430272", name: "december" },
      ];
    }

    const result: TestAllSheetsResult = {
      spreadsheetId: sheetId,
      timestamp: new Date().toISOString(),
      dryRun: isDryRun,
      sheets: [],
      summary: {
        totalSheets: sheetsToTest.length,
        successfulSheets: 0,
        failedSheets: 0,
        totalLeadsFound: 0,
        totalValidLeads: 0,
      },
      allSheetsOk: false,
      message: "",
    };

    // Test each sheet
    for (const sheet of sheetsToTest) {
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
          testResult.sampleLeads = validLeads.slice(0, 2).map((lead) => {
            let name = "N/A";
            let email = "N/A";
            let phone = "(optional)";

            for (const [key, value] of Object.entries(lead)) {
              const strValue = String(value || "").trim();
              if (!strValue) continue;

              const normalizedKey = key
                .toLowerCase()
                .replace(/[\s_]+/g, "_")
                .replace(/[-–!?]/g, "");

              if (
                name === "N/A" &&
                ((normalizedKey.includes("full") && normalizedKey.includes("name")) ||
                  normalizedKey === "name")
              ) {
                name = strValue;
              }

              if (
                email === "N/A" &&
                (normalizedKey.includes("email") || normalizedKey.includes("mail"))
              ) {
                email = strValue;
              }

              if (
                phone === "(optional)" &&
                (normalizedKey.includes("phone") ||
                  normalizedKey.includes("contact") ||
                  normalizedKey.includes("mobile"))
              ) {
                phone = strValue;
              }
            }

            return { name, email, phone };
          });

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
