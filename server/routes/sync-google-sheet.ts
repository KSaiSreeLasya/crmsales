/**
 * API Route: POST /api/sync-google-sheet
 * Fetches data from Google Sheets and syncs to database in one go
 */

import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import {
  fetchGoogleSheet,
  parseLeadRow,
  parseSalespersonRow,
  isValidEmail,
  sanitizeValue,
} from "../../shared/googleSheets";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

interface SyncGoogleSheetRequest {
  spreadsheetId: string;
  sheetId?: string;
  type: "leads" | "salespersons";
}

export const handleSyncGoogleSheet: RequestHandler = async (req, res) => {
  try {
    const { spreadsheetId, sheetId, type } = req.body as SyncGoogleSheetRequest;

    if (!spreadsheetId) {
      res.status(400).json({ error: "spreadsheetId is required" });
      return;
    }

    if (!type || (type !== "leads" && type !== "salespersons")) {
      res.status(400).json({ error: "type must be 'leads' or 'salespersons'" });
      return;
    }

    console.log(
      `Syncing ${type} from Google Sheet ${spreadsheetId} (sheet ${sheetId || "0"})`,
    );

    // Fetch from Google Sheets
    let rows;
    try {
      rows = await fetchGoogleSheet(spreadsheetId, sheetId || "0");
    } catch (fetchError) {
      console.error("Failed to fetch Google Sheet:", fetchError);
      res.status(400).json({
        error:
          "Failed to fetch Google Sheet - ensure the spreadsheet ID is correct and the sheet is publicly shared",
        message:
          fetchError instanceof Error ? fetchError.message : String(fetchError),
        spreadsheetId,
      });
      return;
    }

    if (rows.length === 0) {
      res.status(400).json({
        error:
          "Google Sheet is empty or no data found - ensure the sheet has headers and data rows",
        rows: 0,
        spreadsheetId,
      });
      return;
    }

    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({
        error: "Supabase credentials not configured",
        rows: rows.length,
      });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (type === "leads") {
      console.log(`Processing ${rows.length} rows from Google Sheet...`);

      // Track invalid rows for better error reporting
      const invalidRows: Array<{
        rowIndex: number;
        reason: string;
        data: any;
      }> = [];

      const leadsToSync = rows
        .map((row, rowIndex) => {
          try {
            const parsed = parseLeadRow(row);
            return { parsed, rowIndex };
          } catch (parseError) {
            console.error("Error parsing row:", parseError, row);
            invalidRows.push({
              rowIndex,
              reason: `Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
              data: row,
            });
            return { parsed: null, rowIndex };
          }
        })
        .filter((item) => {
          if (!item.parsed) return false;

          const lead = item.parsed;
          const isValid = lead.name && lead.email && isValidEmail(lead.email);

          if (!isValid) {
            let reason = "Unknown reason";
            if (!lead.name) reason = "Missing name";
            else if (!lead.email) reason = "Missing email";
            else if (!isValidEmail(lead.email)) reason = `Invalid email format: "${lead.email}"`;

            invalidRows.push({
              rowIndex: item.rowIndex,
              reason,
              data: lead,
            });
          }
          return isValid;
        })
        .map((item) => item.parsed);

      if (leadsToSync.length === 0) {
        console.error("No valid leads after filtering:", {
          totalRows: rows.length,
          invalidCount: invalidRows.length,
          sampleInvalid: invalidRows.slice(0, 3),
        });

        res.status(400).json({
          error:
            "No valid leads found in Google Sheet (requires name and email). Phone is optional.",
          processed: rows.length,
          valid: 0,
          sample_row: rows[0] || {},
          invalidRowsCount: invalidRows.length,
          sampleInvalidRows: invalidRows.slice(0, 5).map((item) => ({
            row: item.rowIndex + 1,
            reason: item.reason,
          })),
          hint: "Each row must have: 1) A valid Name, 2) A valid Email address (name@domain.com). Phone is optional.",
        });
        return;
      }

      console.log(
        `Found ${leadsToSync.length} valid leads from ${rows.length} rows`,
      );

      const leadsData = leadsToSync.map((lead) => ({
        name: sanitizeValue(lead.name) || "Unknown",
        email: sanitizeValue(lead.email),
        phone: sanitizeValue(lead.phone || ""),
        company: sanitizeValue(lead.company || ""),
        status: sanitizeValue(lead.status || "Not lifted"),
        assigned_to: sanitizeValue(lead.assignedTo || "Unassigned"),
        note1: sanitizeValue(lead.note1 || ""),
        note2: sanitizeValue(lead.note2 || ""),
        street_address: lead.street_address ? sanitizeValue(lead.street_address) : null,
        post_code: lead.post_code ? sanitizeValue(lead.post_code) : null,
        lead_status: lead.lead_status ? sanitizeValue(lead.lead_status) : null,
        electricity_bill: lead.electricity_bill ? sanitizeValue(lead.electricity_bill) : null,
        type_of_property: (lead as any).type_of_property ? sanitizeValue((lead as any).type_of_property) : null,
        avg_monthly_bill: (lead as any).avg_monthly_bill ? sanitizeValue((lead as any).avg_monthly_bill) : null,
        source: "google_sheet",
      }));

      try {
        console.log(`Inserting ${leadsData.length} leads into Supabase...`);
        const { data, error } = await supabase
          .from("leads")
          .insert(leadsData)
          .select();

        if (error) {
          console.error("Supabase error:", error);
          console.error("Error code:", (error as any).code);
          console.error("Error message:", error.message);
          console.error("Sample lead being inserted:", leadsData[0]);

          // Try updating if duplicate
          if (
            error.message?.includes("duplicate") ||
            (error as any).code === "23505"
          ) {
            console.log("Duplicate key, updating existing records...");
            let updateCount = 0;
            for (const lead of leadsData) {
              const { error: updateErr } = await supabase
                .from("leads")
                .update(lead)
                .eq("email", lead.email);
              if (!updateErr) updateCount++;
            }

            res.json({
              success: true,
              message: `Updated ${updateCount} existing leads from Google Sheet`,
              synced: updateCount,
              processed: rows.length,
              type: "leads",
            });
            return;
          }

          throw error;
        }

        console.log(`✓ Successfully synced ${leadsData.length} leads`);
        res.json({
          success: true,
          message: `Successfully synced ${leadsData.length} leads from Google Sheet`,
          synced: leadsData.length,
          processed: rows.length,
          type: "leads",
        });
      } catch (err) {
        console.error("Error inserting leads:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);

        if (
          errorMessage.includes("relation") ||
          errorMessage.includes("table")
        ) {
          res.status(500).json({
            error:
              "Database table 'leads' does not exist - please ensure Supabase tables are created",
            message: errorMessage,
            processed: rows.length,
            help: "Run the SQL setup from SUPABASE_TABLES.sql in your Supabase dashboard",
          });
        } else {
          res.status(500).json({
            error: "Failed to sync leads to database",
            message: errorMessage,
            processed: rows.length,
          });
        }
      }
    } else {
      // Sync salespersons
      console.log(`Processing ${rows.length} rows for salespersons...`);
      const salespersonsToSync = rows
        .map(parseSalespersonRow)
        .filter((person) => person.name);

      if (salespersonsToSync.length === 0) {
        res.status(400).json({
          error:
            "No valid salespersons found in Google Sheet (requires name). Please ensure your sheet has a Name column",
          processed: rows.length,
          valid: 0,
          sample_row: rows[0] || {},
        });
        return;
      }

      console.log(`Found ${salespersonsToSync.length} valid salespersons`);

      const salespersonsData = salespersonsToSync.map((person) => ({
        name: person.name,
        email: person.email || "",
        phone: person.phone || "",
        department: "",
        region: "",
      }));

      try {
        console.log(
          `Inserting ${salespersonsData.length} salespersons into Supabase...`,
        );
        const { data, error } = await supabase
          .from("salespersons")
          .insert(salespersonsData)
          .select();

        if (error) {
          console.error("Supabase error:", error);

          // Try updating if duplicate
          if (
            error.message?.includes("duplicate") ||
            (error as any).code === "23505"
          ) {
            console.log("Duplicate key, updating existing records...");
            let updateCount = 0;
            for (const person of salespersonsData) {
              const { error: updateErr } = await supabase
                .from("salespersons")
                .update(person)
                .eq("email", person.email)
                .neq("email", "");
              if (!updateErr) updateCount++;
            }

            res.json({
              success: true,
              message: `Updated ${updateCount} existing salespersons from Google Sheet`,
              synced: updateCount,
              processed: rows.length,
              type: "salespersons",
            });
            return;
          }

          throw error;
        }

        console.log(
          `✓ Successfully synced ${salespersonsData.length} salespersons`,
        );
        res.json({
          success: true,
          message: `Successfully synced ${salespersonsData.length} salespersons from Google Sheet`,
          synced: salespersonsData.length,
          processed: rows.length,
          type: "salespersons",
        });
      } catch (err) {
        console.error("Error inserting salespersons:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);

        if (
          errorMessage.includes("relation") ||
          errorMessage.includes("table")
        ) {
          res.status(500).json({
            error:
              "Database table 'salespersons' does not exist - please ensure Supabase tables are created",
            message: errorMessage,
            processed: rows.length,
            help: "Run the SQL setup from SUPABASE_TABLES.sql in your Supabase dashboard",
          });
        } else {
          res.status(500).json({
            error: "Failed to sync salespersons to database",
            message: errorMessage,
            processed: rows.length,
          });
        }
      }
    }
  } catch (error) {
    console.error("Error in sync-google-sheet:", error);
    res.status(500).json({
      error: "Failed to sync from Google Sheet",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
