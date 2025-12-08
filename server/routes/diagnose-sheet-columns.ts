/**
 * API Route: GET /api/diagnose-sheet-columns
 * Diagnoses column alignment issues in Google Sheets
 * Shows first few rows and column names to identify misalignment
 */

import { RequestHandler } from "express";
import { fetchGoogleSheet } from "../../shared/googleSheets";

export const handleDiagnoseSheetColumns: RequestHandler = async (req, res) => {
  try {
    const { spreadsheetId, sheetId } = req.query;

    if (!spreadsheetId || typeof spreadsheetId !== "string") {
      res.status(400).json({ error: "spreadsheetId is required" });
      return;
    }

    console.log(
      `Diagnosing sheet columns for: ${spreadsheetId}, sheetId: ${sheetId}`,
    );

    const rows = await fetchGoogleSheet(
      spreadsheetId,
      (sheetId as string) || "0",
    );

    if (rows.length === 0) {
      res.json({
        status: "empty",
        message: "Sheet is empty",
      });
      return;
    }

    // Get all column names from all rows
    const allColumns = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        allColumns.add(key);
      });
    });

    const columnNames = Array.from(allColumns);

    // Analyze the first 5 data rows to understand the structure
    const sampleRows = rows.slice(0, 5).map((row, index) => {
      const analysis: any = {
        rowNum: index,
        columns: {},
      };

      columnNames.forEach((col) => {
        const value = row[col];
        if (value) {
          // Analyze what type of data this looks like
          const strValue = String(value).trim();
          let dataType = "unknown";

          if (/^\d+$/.test(strValue)) {
            dataType = "number";
          } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
            dataType = "email";
          } else if (/^\d{10,}$/.test(strValue.replace(/[\s\-\+]/g, ""))) {
            dataType = "phone";
          } else if (strValue.length < 50 && /^[a-zA-Z\s]+$/.test(strValue)) {
            dataType = "name";
          } else if (
            strValue.includes("@") &&
            !strValue.includes("@gmail.com")
          ) {
            dataType = "email_alt";
          } else if (strValue.length > 20) {
            dataType = "address";
          } else {
            dataType = "other";
          }

          analysis.columns[col] = {
            value: strValue.substring(0, 50),
            type: dataType,
            fullLength: strValue.length,
          };
        } else {
          analysis.columns[col] = { value: "", type: "empty" };
        }
      });

      return analysis;
    });

    // Check for common alignment issues
    const issues: string[] = [];

    // Look for misaligned columns
    const nameColumns = columnNames.filter((c) =>
      c.toLowerCase().includes("name"),
    );
    const emailColumns = columnNames.filter((c) =>
      c.toLowerCase().includes("email"),
    );
    const phoneColumns = columnNames.filter((c) =>
      c.toLowerCase().includes("phone"),
    );

    if (nameColumns.length === 0) {
      issues.push(
        "No 'name' column found. Check if name column header is spelled correctly.",
      );
    }
    if (emailColumns.length === 0) {
      issues.push(
        "No 'email' column found. Check if email column header is spelled correctly.",
      );
    }
    if (phoneColumns.length === 0) {
      issues.push(
        "No 'phone' column found. Check if phone column header is spelled correctly.",
      );
    }

    // Check if email column actually contains email addresses
    if (emailColumns.length > 0) {
      const emailCol = emailColumns[0];
      const emailValues = rows
        .slice(0, 10)
        .map((r) => r[emailCol])
        .filter((v) => v);

      const validEmails = emailValues.filter((v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()),
      ).length;

      if (validEmails === 0 && emailValues.length > 0) {
        issues.push(
          `Warning: Column "${emailCol}" has header "email" but no values look like email addresses. Values: ${emailValues.slice(0, 3).join(", ")}`,
        );
      }
    }

    // Check if name column contains actual names
    if (nameColumns.length > 0) {
      const nameCol = nameColumns[0];
      const nameValues = rows
        .slice(0, 10)
        .map((r) => r[nameCol])
        .filter((v) => v);

      const validNames = nameValues.filter(
        (v) => String(v).trim().length > 2 && /[a-zA-Z]/.test(String(v)),
      ).length;

      if (validNames === 0 && nameValues.length > 0) {
        issues.push(
          `Warning: Column "${nameCol}" has header "name" but values don't look like names. Values: ${nameValues.slice(0, 3).join(", ")}`,
        );
      }
    }

    res.json({
      status: "ok",
      totalRows: rows.length,
      columnCount: columnNames.length,
      columnNames,
      sampleRows,
      issues,
      recommendation:
        issues.length > 0
          ? "Column alignment issues detected. Check your Google Sheet structure."
          : "Sheet structure looks correct.",
    });
  } catch (error) {
    console.error("Error diagnosing sheet columns:", error);
    res.status(500).json({
      error: "Failed to diagnose sheet columns",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
