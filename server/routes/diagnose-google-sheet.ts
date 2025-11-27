import { RequestHandler } from "express";
import { fetchGoogleSheet } from "../../shared/googleSheets";

export const handleDiagnoseGoogleSheet: RequestHandler = async (req, res) => {
  try {
    const { spreadsheetId, sheetId } = req.query;

    if (!spreadsheetId || typeof spreadsheetId !== "string") {
      res.status(400).json({ error: "spreadsheetId is required" });
      return;
    }

    console.log(
      `[DIAGNOSE] Fetching sheet ${spreadsheetId} (sheet ${sheetId || "0"})`,
    );

    const rows = await fetchGoogleSheet(
      spreadsheetId,
      (sheetId as string) || "0",
    );

    console.log(`[DIAGNOSE] Fetched ${rows.length} total rows`);

    if (rows.length === 0) {
      return res.json({
        status: "empty",
        totalRows: 0,
        message: "Sheet is empty",
      });
    }

    // Analyze first 10 rows
    const sampleRows = rows.slice(0, 10);
    const allColumns = new Set<string>();
    const columnStats: {
      [key: string]: {
        count: number;
        samples: string[];
        hasData: boolean;
      };
    } = {};

    // Collect all columns and stats
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        allColumns.add(key);
        if (!columnStats[key]) {
          columnStats[key] = { count: 0, samples: [], hasData: false };
        }
        const value = String(row[key] || "").trim();
        if (value && value !== "null" && value !== "undefined") {
          columnStats[key].hasData = true;
          columnStats[key].count++;
          if (columnStats[key].samples.length < 3) {
            columnStats[key].samples.push(value.substring(0, 50));
          }
        }
      });
    });

    // Count rows with actual data
    let dataRowCount = 0;
    let dateRowCount = 0;
    const validLeadsPreview = [];

    rows.forEach((row, index) => {
      if (row._isDateRow === "true" || row._isDateRow === true) {
        dateRowCount++;
        return;
      }

      const nonEmptyFields = Object.values(row).filter(
        (v) => v && String(v).trim() !== "",
      ).length;

      if (nonEmptyFields >= 2) {
        dataRowCount++;
        if (validLeadsPreview.length < 5) {
          validLeadsPreview.push({
            index,
            data: row,
            nonEmptyFields,
          });
        }
      }
    });

    return res.json({
      status: "success",
      totalRows: rows.length,
      dataRows: dataRowCount,
      dateRows: dateRowCount,
      emptyRows: rows.length - dataRowCount - dateRowCount,
      columns: {
        total: allColumns.size,
        list: Array.from(allColumns),
        stats: columnStats,
      },
      sampleDataRows: validLeadsPreview.slice(0, 3),
      diagnosticMessage: `Found ${dataRowCount} data rows with 2+ fields out of ${rows.length} total rows. ${dateRowCount} are date separators.`,
    });
  } catch (error) {
    console.error("[DIAGNOSE] Error:", error);
    res.status(500).json({
      error: "Failed to diagnose Google Sheet",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
