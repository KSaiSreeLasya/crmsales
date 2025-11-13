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
} from "@shared/googleSheets";

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
      res
        .status(400)
        .json({ error: "type must be 'leads' or 'salespersons'" });
      return;
    }

    console.log(
      `Syncing ${type} from Google Sheet ${spreadsheetId} (sheet ${sheetId || "0"})`,
    );

    // Fetch from Google Sheets
    const rows = await fetchGoogleSheet(spreadsheetId, sheetId || "0");

    if (rows.length === 0) {
      res.status(400).json({
        error: "Google Sheet is empty or no data found",
        rows: 0,
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
      const leadsToSync = rows
        .map(parseLeadRow)
        .filter((lead) => lead.name && lead.email);

      if (leadsToSync.length === 0) {
        res.status(400).json({
          error: "No valid leads found in Google Sheet (requires name and email)",
          processed: rows.length,
          valid: 0,
        });
        return;
      }

      const leadsData = leadsToSync.map((lead) => ({
        name: lead.name,
        email: lead.email,
        phone: lead.phone || "",
        company: lead.company || "",
        status: lead.status || "Not lifted",
        assigned_to: lead.assignedTo || "Unassigned",
        note1: lead.note1 || "",
        note2: lead.note2 || "",
        street_address: lead.street_address || null,
        post_code: lead.post_code || null,
        lead_status: lead.lead_status || null,
        electricity_bill: lead.electricity_bill || null,
        source: "google_sheet",
      }));

      try {
        const { data, error } = await supabase
          .from("leads")
          .insert(leadsData)
          .select();

        if (error) {
          console.error("Supabase error:", error);

          // Try updating if duplicate
          if (
            error.message?.includes("duplicate") ||
            (error as any).code === "23505"
          ) {
            console.log("Duplicate key, updating existing records...");
            for (const lead of leadsData) {
              await supabase
                .from("leads")
                .update(lead)
                .eq("email", lead.email);
            }

            res.json({
              success: true,
              message: "Updated existing leads from Google Sheet",
              synced: leadsData.length,
              processed: rows.length,
              type: "leads",
            });
            return;
          }

          throw error;
        }

        res.json({
          success: true,
          message: `Successfully synced ${leadsData.length} leads from Google Sheet`,
          synced: leadsData.length,
          processed: rows.length,
          type: "leads",
        });
      } catch (err) {
        console.error("Error inserting leads:", err);
        res.status(500).json({
          error: "Failed to sync leads to database",
          message: err instanceof Error ? err.message : "Unknown error",
          processed: rows.length,
        });
      }
    } else {
      // Sync salespersons
      const salespersonsToSync = rows
        .map(parseSalespersonRow)
        .filter((person) => person.name);

      if (salespersonsToSync.length === 0) {
        res.status(400).json({
          error: "No valid salespersons found in Google Sheet (requires name)",
          processed: rows.length,
          valid: 0,
        });
        return;
      }

      const salespersonsData = salespersonsToSync.map((person) => ({
        name: person.name,
        email: person.email || "",
        phone: person.phone || "",
        department: "",
        region: "",
      }));

      try {
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
            for (const person of salespersonsData) {
              await supabase
                .from("salespersons")
                .update(person)
                .eq("email", person.email)
                .neq("email", "");
            }

            res.json({
              success: true,
              message: "Updated existing salespersons from Google Sheet",
              synced: salespersonsData.length,
              processed: rows.length,
              type: "salespersons",
            });
            return;
          }

          throw error;
        }

        res.json({
          success: true,
          message: `Successfully synced ${salespersonsData.length} salespersons from Google Sheet`,
          synced: salespersonsData.length,
          processed: rows.length,
          type: "salespersons",
        });
      } catch (err) {
        console.error("Error inserting salespersons:", err);
        res.status(500).json({
          error: "Failed to sync salespersons to database",
          message: err instanceof Error ? err.message : "Unknown error",
          processed: rows.length,
        });
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
