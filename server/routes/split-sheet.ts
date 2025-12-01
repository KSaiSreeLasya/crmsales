/**
 * API Route: POST /api/split-sheet
 * Splits a large Google Sheet into two smaller sheets
 * Uses Google Sheets API v4 to create new sheets and copy data
 */

import { RequestHandler } from "express";

const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY || "";
const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets";

interface SplitSheetRequest {
  spreadsheetId: string;
  sheetId: string;
  sheetName: string;
  splitPoint?: number;
}

interface SheetRow {
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

async function createNewSheet(
  spreadsheetId: string,
  sheetTitle: string,
  apiKey: string,
): Promise<number> {
  const url = `${SHEETS_API_URL}/${spreadsheetId}:batchUpdate`;

  const body = {
    requests: [
      {
        addSheet: {
          properties: {
            title: sheetTitle,
          },
        },
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create sheet: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const newSheetId = data.replies[0].addSheet.properties.sheetId;
    console.log(`Created new sheet with ID: ${newSheetId}`);
    return newSheetId;
  } catch (error) {
    console.error("Error creating new sheet:", error);
    throw error;
  }
}

async function appendDataToSheet(
  spreadsheetId: string,
  sheetName: string,
  values: any[][],
  apiKey: string,
): Promise<void> {
  const url = `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(
    sheetName,
  )}:append?valueInputOption=USER_ENTERED&key=${apiKey}`;

  const body = {
    values: values,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to append data: ${JSON.stringify(errorData)}`);
    }

    console.log(`Appended ${values.length} rows to sheet ${sheetName}`);
  } catch (error) {
    console.error("Error appending data to sheet:", error);
    throw error;
  }
}

export const handleSplitSheet: RequestHandler = async (req, res) => {
  try {
    const { spreadsheetId, sheetId, sheetName, splitPoint } =
      req.body as SplitSheetRequest;

    if (!spreadsheetId || !sheetName) {
      res.status(400).json({
        error: "spreadsheetId and sheetName are required",
      });
      return;
    }

    if (!GOOGLE_SHEETS_API_KEY) {
      res.status(500).json({
        error: "Google Sheets API key not configured",
        hint: "Set GOOGLE_SHEETS_API_KEY environment variable with write permissions",
      });
      return;
    }

    console.log(
      `Starting sheet split for: ${sheetName} (ID: ${sheetId}) in spreadsheet ${spreadsheetId}`,
    );

    // Fetch all data from the sheet
    const allRows = await fetchSheetValues(
      spreadsheetId,
      sheetName,
      GOOGLE_SHEETS_API_KEY,
    );

    if (allRows.length === 0) {
      res.status(400).json({
        error: "Sheet is empty",
      });
      return;
    }

    const headers = allRows[0];
    const dataRows = allRows.slice(1);

    console.log(
      `Total rows in sheet: ${allRows.length}, data rows: ${dataRows.length}`,
    );

    // Calculate split point if not provided (50/50 split)
    const calculatedSplitPoint = splitPoint || Math.ceil(dataRows.length / 2);

    if (calculatedSplitPoint <= 0 || calculatedSplitPoint >= dataRows.length) {
      res.status(400).json({
        error: "Invalid split point",
        message: `Split point must be between 1 and ${dataRows.length - 1}`,
      });
      return;
    }

    // Split the data into two parts
    const firstPart = dataRows.slice(0, calculatedSplitPoint);
    const secondPart = dataRows.slice(calculatedSplitPoint);

    console.log(
      `Splitting into: ${firstPart.length} + ${secondPart.length} rows`,
    );

    // Create new sheet names
    const timestamp = new Date().toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const firstSheetName = `${sheetName} - Part 1 (${timestamp})`;
    const secondSheetName = `${sheetName} - Part 2 (${timestamp})`;

    console.log(
      `Creating new sheets: "${firstSheetName}" and "${secondSheetName}"`,
    );

    // Create first new sheet
    const firstNewSheetId = await createNewSheet(
      spreadsheetId,
      firstSheetName,
      GOOGLE_SHEETS_API_KEY,
    );

    // Create second new sheet
    const secondNewSheetId = await createNewSheet(
      spreadsheetId,
      secondSheetName,
      GOOGLE_SHEETS_API_KEY,
    );

    // Append data to first sheet
    console.log(`Appending ${firstPart.length} rows to ${firstSheetName}`);
    await appendDataToSheet(
      spreadsheetId,
      firstSheetName,
      [headers, ...firstPart],
      GOOGLE_SHEETS_API_KEY,
    );

    // Append data to second sheet
    console.log(`Appending ${secondPart.length} rows to ${secondSheetName}`);
    await appendDataToSheet(
      spreadsheetId,
      secondSheetName,
      [headers, ...secondPart],
      GOOGLE_SHEETS_API_KEY,
    );

    console.log(
      `✓ Successfully split ${sheetName} into ${firstSheetName} and ${secondSheetName}`,
    );

    res.json({
      success: true,
      message: `Successfully split sheet into two parts`,
      originalSheet: sheetName,
      firstSheet: {
        name: firstSheetName,
        id: String(firstNewSheetId),
        rowCount: firstPart.length,
      },
      secondSheet: {
        name: secondSheetName,
        id: String(secondNewSheetId),
        rowCount: secondPart.length,
      },
      totalRows: dataRows.length,
      splitPoint: calculatedSplitPoint,
    });
  } catch (error) {
    console.error("Error splitting sheet:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("401") ||
      errorMessage.includes("403") ||
      errorMessage.includes("permission")
    ) {
      res.status(403).json({
        error: "Permission denied - API key lacks write permissions",
        message: errorMessage,
        hint: "Ensure GOOGLE_SHEETS_API_KEY has write access (edit sheets permission)",
      });
    } else if (errorMessage.includes("404")) {
      res.status(404).json({
        error: "Sheet or spreadsheet not found",
        message: errorMessage,
      });
    } else {
      res.status(500).json({
        error: "Failed to split sheet",
        message: errorMessage,
      });
    }
  }
};
