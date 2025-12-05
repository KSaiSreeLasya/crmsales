/**
 * API Route: POST /api/diagnose-sync-issue
 * Diagnoses why sync is failing for specific sheets
 * Tests data extraction and validation without actually syncing
 */

import { RequestHandler } from "express";
import { fetchGoogleSheet } from "../../shared/googleSheets";
import { createClient } from "@supabase/supabase-js";

interface DiagnosticRequest {
  spreadsheetId: string;
  sheetId: string;
  sheetName?: string;
}

interface DiagnosticResult {
  success: boolean;
  sheetInfo: {
    spreadsheetId: string;
    sheetId: string;
    sheetName: string;
  };
  dataExtraction: {
    totalRowsFetched: number;
    dateRows: number;
    dataRows: number;
    headerColumns: string[];
    headerCount: number;
  };
  sampleRows?: Array<{ [key: string]: string }>;
  fieldValidation?: {
    hasEmailColumn: boolean;
    hasPhoneColumn: boolean;
    hasNameColumn: boolean;
    emailCoverage: number;
    phoneCoverage: number;
    nameCoverage: number;
  };
  databaseCheck?: {
    supabaseConnected: boolean;
    tableExists: boolean;
    columnsMissing: string[];
  };
  issues: string[];
  recommendations: string[];
}

export const handleDiagnoseSyncIssue: RequestHandler = async (req, res) => {
  const { spreadsheetId, sheetId, sheetName } = req.body as DiagnosticRequest;

  const result: DiagnosticResult = {
    success: false,
    sheetInfo: {
      spreadsheetId,
      sheetId,
      sheetName: sheetName || `Sheet ${sheetId}`,
    },
    dataExtraction: {
      totalRowsFetched: 0,
      dateRows: 0,
      dataRows: 0,
      headerColumns: [],
      headerCount: 0,
    },
    issues: [],
    recommendations: [],
  };

  try {
    // Step 1: Fetch data from Google Sheets
    console.log(
      `[DIAGNOSE] Fetching ${sheetName || `sheet ${sheetId}`} from spreadsheet ${spreadsheetId}`,
    );

    const rows = await fetchGoogleSheet(spreadsheetId, sheetId);
    console.log(`[DIAGNOSE] Fetched ${rows.length} total rows`);

    // Count date rows and data rows
    const dateRows = rows.filter((r) => r._isDateRow === "true").length;
    const dataRows = rows.filter((r) => r._isDateRow !== "true").length;

    result.dataExtraction.totalRowsFetched = rows.length;
    result.dataExtraction.dateRows = dateRows;
    result.dataExtraction.dataRows = dataRows;

    if (rows.length === 0) {
      result.issues.push("Sheet is completely empty - no rows fetched");
      result.recommendations.push("Verify the sheet has data and is publicly accessible");
      res.json(result);
      return;
    }

    // Step 2: Analyze header row (first non-date row)
    const firstDataRow = rows.find((r) => r._isDateRow !== "true");
    if (firstDataRow) {
      const headers = Object.keys(firstDataRow);
      result.dataExtraction.headerColumns = headers;
      result.dataExtraction.headerCount = headers.length;

      console.log(`[DIAGNOSE] Headers (${headers.length}):`, headers);
    }

    // Step 3: Check for required columns
    const headerText = Object.keys(firstDataRow || {})
      .map((h) => h.toLowerCase())
      .join("|");

    const hasEmailColumn = headerText.includes("email");
    const hasPhoneColumn = headerText.includes("phone");
    const hasNameColumn =
      headerText.includes("name") || headerText.includes("full");

    console.log(`[DIAGNOSE] Column check - Email: ${hasEmailColumn}, Phone: ${hasPhoneColumn}, Name: ${hasNameColumn}`);

    // Step 4: Check field coverage (how many rows have data)
    const dataRowsOnly = rows.filter((r) => r._isDateRow !== "true");
    let emailCount = 0;
    let phoneCount = 0;
    let nameCount = 0;

    dataRowsOnly.forEach((row) => {
      const emailVal =
        row.email ||
        row.Email ||
        row.EMAIL ||
        row["email address"] ||
        row["Email Address"] ||
        "";
      const phoneVal =
        row.phone ||
        row.Phone ||
        row.PHONE ||
        row["phone number"] ||
        row["Phone Number"] ||
        "";
      const nameVal =
        row.name ||
        row.Name ||
        row["full name"] ||
        row["Full Name"] ||
        row["FULL NAME"] ||
        "";

      if (emailVal && String(emailVal).trim()) emailCount++;
      if (phoneVal && String(phoneVal).trim()) phoneCount++;
      if (nameVal && String(nameVal).trim()) nameCount++;
    });

    const emailCoverage = dataRowsOnly.length > 0 ? Math.round((emailCount / dataRowsOnly.length) * 100) : 0;
    const phoneCoverage = dataRowsOnly.length > 0 ? Math.round((phoneCount / dataRowsOnly.length) * 100) : 0;
    const nameCoverage = dataRowsOnly.length > 0 ? Math.round((nameCount / dataRowsOnly.length) * 100) : 0;

    result.fieldValidation = {
      hasEmailColumn,
      hasPhoneColumn,
      hasNameColumn,
      emailCoverage,
      phoneCoverage,
      nameCoverage,
    };

    console.log(`[DIAGNOSE] Field coverage - Email: ${emailCoverage}%, Phone: ${phoneCoverage}%, Name: ${nameCoverage}%`);

    // Step 5: Collect sample rows
    result.sampleRows = dataRowsOnly.slice(0, 3).map((row) => {
      const sample: { [key: string]: string } = {};
      Object.keys(row).forEach((key) => {
        const val = String(row[key] || "").substring(0, 50);
        if (val) sample[key] = val;
      });
      return sample;
    });

    // Step 6: Check Supabase connectivity and schema
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
      result.issues.push("Supabase credentials not configured");
      result.recommendations.push("Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
      result.databaseCheck = {
        supabaseConnected: false,
        tableExists: false,
        columnsMissing: [],
      };
    } else {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Try to fetch schema information
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .limit(1);

        if (error) {
          result.databaseCheck = {
            supabaseConnected: true,
            tableExists: !error.message.includes("does not exist"),
            columnsMissing: error.message.includes("column") ? [error.message] : [],
          };

          if (!result.databaseCheck.tableExists) {
            result.issues.push("'leads' table does not exist in Supabase");
            result.recommendations.push("Run the migration SQL to create the leads table");
          } else if (result.databaseCheck.columnsMissing.length > 0) {
            result.issues.push(`Missing columns: ${error.message}`);
            result.recommendations.push("Run the migration SQL to add missing columns");
          }
        } else {
          result.databaseCheck = {
            supabaseConnected: true,
            tableExists: true,
            columnsMissing: [],
          };
        }
      } catch (dbError) {
        result.databaseCheck = {
          supabaseConnected: false,
          tableExists: false,
          columnsMissing: [],
        };
        result.issues.push(
          `Database connection error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
        );
      }
    }

    // Step 7: Generate issues and recommendations
    if (!hasEmailColumn) {
      result.issues.push(
        "Email column not found - sheet must have a column with 'email' in the name",
      );
      result.recommendations.push(
        "Rename or add an 'Email' column in the Google Sheet",
      );
    }

    if (!hasPhoneColumn) {
      result.issues.push(
        "Phone column not found - sheet must have a column with 'phone' in the name",
      );
      result.recommendations.push(
        "Rename or add a 'Phone' column in the Google Sheet",
      );
    }

    if (!hasNameColumn) {
      result.issues.push(
        "Name column not found - sheet must have a column with 'name' in the name",
      );
      result.recommendations.push(
        "Rename or add a 'Name' or 'Full Name' column in the Google Sheet",
      );
    }

    if (emailCoverage < 50) {
      result.issues.push(
        `Low email coverage (${emailCoverage}%) - many rows have missing email values`,
      );
      result.recommendations.push(
        "Fill in missing email values in the Email column",
      );
    }

    if (phoneCoverage < 50) {
      result.issues.push(
        `Low phone coverage (${phoneCoverage}%) - many rows have missing phone values`,
      );
      result.recommendations.push(
        "Fill in missing phone values in the Phone column",
      );
    }

    if (nameCoverage < 50) {
      result.issues.push(
        `Low name coverage (${nameCoverage}%) - many rows have missing name values`,
      );
      result.recommendations.push(
        "Fill in missing name values in the Name column",
      );
    }

    // Determine success
    result.success =
      result.issues.length === 0 ||
      (hasEmailColumn && hasPhoneColumn && hasNameColumn && emailCoverage > 0);

    console.log(`[DIAGNOSE] Diagnostic complete - Success: ${result.success}`);
    console.log(`[DIAGNOSE] Issues found: ${result.issues.length}`);
    console.log(`[DIAGNOSE] Recommendations: ${result.recommendations.length}`);

    res.json(result);
  } catch (error) {
    console.error("[DIAGNOSE] Error during diagnostic:", error);

    result.issues.push(
      `Diagnostic error: ${error instanceof Error ? error.message : String(error)}`,
    );
    result.recommendations.push("Check server logs for detailed error information");

    res.status(500).json(result);
  }
};
