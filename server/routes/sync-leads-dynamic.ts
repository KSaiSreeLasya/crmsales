/**
 * API Route: POST /api/sync-leads-dynamic
 * Syncs leads with ALL columns from Google Sheets to Supabase database
 * Preserves exact column names from the sheet
 */

import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

interface DynamicLeadRequest {
  leads: Array<{ [key: string]: string | number | undefined }>;
  source: string;
  sheetId?: string;
}

export const handleSyncLeadsDynamic: RequestHandler = async (req, res) => {
  try {
    const { leads, source, sheetId } = req.body as DynamicLeadRequest;

    console.log(
      "Dynamic sync request received with leads:",
      leads.length,
      "from sheet:",
      sheetId,
    );
    console.log("Sheet ID received:", sheetId, "Type:", typeof sheetId);
    if (leads.length > 0) {
      console.log("First lead sample:", leads[0]);
      console.log("Available columns:", Object.keys(leads[0]));
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      res.status(400).json({ error: "No leads provided" });
      return;
    }

    // For dynamic sync, validate that rows have meaningful data and required fields
    const validLeads = leads.filter((lead) => {
      // Get email and name-like fields to check
      const normalizedKeys = Object.keys(lead).map((k) =>
        k.toLowerCase().trim().replace(/\s+/g, "_"),
      );

      // Check for email field
      let emailValue = "";
      let nameValue = "";

      for (const [key, value] of Object.entries(lead)) {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
        const strValue = String(value || "").trim();

        if (normalizedKey.includes("email") && strValue) {
          emailValue = strValue;
        }
        if (
          (normalizedKey.includes("full") || normalizedKey.includes("name")) &&
          strValue &&
          !normalizedKey.includes("email")
        ) {
          nameValue = strValue;
        }
      }

      // Must have both email and name to be valid
      const hasEmail = emailValue.length > 0 && emailValue !== "N/A";
      const hasName = nameValue.length > 0;

      const nonEmptyFields = Object.values(lead).filter(
        (v) => v !== undefined && v !== null && String(v).trim() !== "",
      ).length;

      // Must have at least 2 non-empty fields AND valid email and name
      return hasEmail && hasName && nonEmptyFields >= 2;
    });

    console.log("Valid leads after filtering:", validLeads.length);
    console.log(
      "Filtered out empty/sparse rows:",
      leads.length - validLeads.length,
    );
    if (validLeads.length > 0) {
      console.log("First valid lead:", validLeads[0]);
      console.log("Columns in first lead:", Object.keys(validLeads[0]));
    }

    if (validLeads.length === 0) {
      res.status(400).json({
        error:
          "No valid leads found - all rows appear to be empty or contain only dates",
        totalRowsFetched: leads.length,
      });
      return;
    }

    if (!supabaseUrl || !supabaseKey) {
      console.warn("Supabase not configured, returning mock response");
      res.json({
        success: true,
        message: `${validLeads.length} leads processed (Supabase not configured)`,
        synced: validLeads.length,
        source: source,
        warning: "Supabase credentials not configured",
      });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Define allowed columns in Supabase schema
    const allowedColumns = new Set([
      "id",
      "name",
      "email",
      "phone",
      "company",
      "status",
      "assigned_to",
      "note1",
      "note2",
      "street_address",
      "post_code",
      "lead_status",
      "electricity_bill",
      "type_of_property",
      "avg_monthly_bill",
      "sheet_id",
      "source",
      "created_at",
      "updated_at",
    ]);

    // Prepare leads data - normalize column names to match Supabase schema
    const leadsToSync = validLeads.map((lead) => {
      // Map Google Sheet column names to Supabase column names
      // Ensure sheet_id is always a string
      const finalSheetId = String(sheetId || "0").trim();
      const syncData: any = {
        source: source || "google_sheet",
        sheet_id: finalSheetId,
      };

      console.log(
        `Preparing lead with sheet_id: "${finalSheetId}" (type: ${typeof finalSheetId})`,
      );

      // Normalize column names and map to Supabase schema
      for (const [key, value] of Object.entries(lead)) {
        const normalizedKey = key
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[?]/g, "");

        // Map common column name variations
        let dbColumn = normalizedKey;
        if (normalizedKey.includes("full") && normalizedKey.includes("name")) {
          dbColumn = "name";
        } else if (normalizedKey.includes("email")) {
          dbColumn = "email";
        } else if (normalizedKey.includes("phone")) {
          dbColumn = "phone";
        } else if (normalizedKey.includes("company")) {
          dbColumn = "company";
        } else if (
          normalizedKey.includes("street") ||
          normalizedKey.includes("address")
        ) {
          dbColumn = "street_address";
        } else if (
          normalizedKey.includes("post") ||
          normalizedKey.includes("postal") ||
          normalizedKey.includes("zip")
        ) {
          dbColumn = "post_code";
        } else if (
          normalizedKey.includes("lead") &&
          normalizedKey.includes("status")
        ) {
          dbColumn = "lead_status";
        } else if (
          normalizedKey.includes("type") &&
          normalizedKey.includes("property")
        ) {
          dbColumn = "type_of_property";
        } else if (
          normalizedKey.includes("avg") &&
          normalizedKey.includes("monthly")
        ) {
          dbColumn = "avg_monthly_bill";
        } else if (
          normalizedKey.includes("electricity") ||
          (normalizedKey.includes("bill") && !normalizedKey.includes("monthly"))
        ) {
          dbColumn = "electricity_bill";
        } else if (
          normalizedKey.includes("note") &&
          normalizedKey.includes("1")
        ) {
          dbColumn = "note1";
        } else if (
          normalizedKey.includes("note") &&
          normalizedKey.includes("2")
        ) {
          dbColumn = "note2";
        }

        // Only add column if it exists in Supabase schema
        if (!allowedColumns.has(dbColumn)) {
          console.log(`Skipping unknown column: ${key} -> ${dbColumn}`);
          continue;
        }

        // Ensure all values are properly formatted
        let formattedValue = "";
        if (value !== undefined && value !== null) {
          formattedValue = String(value).trim();
        }

        if (formattedValue) {
          syncData[dbColumn] = formattedValue;
        }
      }

      // Ensure required fields exist
      if (!syncData.name) syncData.name = "";
      if (!syncData.email) syncData.email = "";
      if (!syncData.phone) syncData.phone = "";
      if (!syncData.company) syncData.company = "";
      if (!syncData.status) syncData.status = "Not lifted";
      if (!syncData.assigned_to) syncData.assigned_to = "Unassigned";

      return syncData;
    });

    console.log("Attempting to insert leads to Supabase...");
    console.log("Total leads to sync:", leadsToSync.length);
    console.log("Sample lead:", leadsToSync[0]);
    console.log("Sample lead sheet_id:", leadsToSync[0].sheet_id);
    console.log("Columns:", Object.keys(leadsToSync[0]));

    try {
      // First, try to insert new records
      console.log("Inserting leads into Supabase...");
      const { data, error } = await supabase
        .from("leads")
        .insert(leadsToSync)
        .select();

      if (error) {
        console.error("Supabase insert error:", error);
        console.error("Full error object:", JSON.stringify(error, null, 2));

        // If duplicate key error, try update
        if (
          error.message?.includes("duplicate") ||
          (error as any).code === "23505"
        ) {
          console.log(
            "Duplicate key detected, attempting to update existing records...",
          );

          try {
            let updateCount = 0;
            for (const lead of leadsToSync) {
              // Find a unique identifier to match on (email or name)
              const email = lead.email || lead.Email || lead.EMAIL;
              const name = lead.name || lead.Name || lead.NAME;

              if (email) {
                const { error: updateError } = await supabase
                  .from("leads")
                  .update(lead)
                  .eq("email", email);
                if (!updateError) {
                  updateCount++;
                } else {
                  console.warn(
                    `Failed to update lead with email ${email}:`,
                    updateError,
                  );
                }
              } else if (name) {
                const { error: updateError } = await supabase
                  .from("leads")
                  .update(lead)
                  .eq("name", name);
                if (!updateError) {
                  updateCount++;
                } else {
                  console.warn(
                    `Failed to update lead with name ${name}:`,
                    updateError,
                  );
                }
              }
            }

            console.log(
              `Updated ${updateCount} out of ${leadsToSync.length} leads`,
            );

            res.json({
              success: true,
              message: `Successfully updated ${updateCount} existing leads (${leads.length - leadsToSync.length} empty rows removed)`,
              synced: updateCount,
              totalFetched: leads.length,
              emptyRowsRemoved: leads.length - leadsToSync.length,
              source: source,
              columnsIncluded: Object.keys(leadsToSync[0]),
            });
            return;
          } catch (updateErr) {
            console.error("Error during update operation:", updateErr);
            res.status(500).json({
              error: "Failed to update duplicate leads",
              message:
                updateErr instanceof Error
                  ? updateErr.message
                  : String(updateErr),
            });
            return;
          }
        }

        // For other errors, return details
        res.status(400).json({
          error: "Failed to insert leads",
          message: error.message,
          details: (error as any).details,
          code: (error as any).code,
          hint: "Ensure all required columns exist in Supabase table",
        });
        return;
      }

      console.log("Successfully inserted", data?.length, "leads");
      res.json({
        success: true,
        message: `${leadsToSync.length} leads synced successfully (${leads.length - leadsToSync.length} empty rows removed)`,
        synced: leadsToSync.length,
        totalFetched: leads.length,
        emptyRowsRemoved: leads.length - leadsToSync.length,
        source: source,
        columnsIncluded: Object.keys(leadsToSync[0]),
      });
    } catch (err) {
      console.error("Unexpected error during sync:", err);
      res.status(500).json({
        error: "Unexpected error syncing leads",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  } catch (error) {
    console.error("Error syncing leads dynamically:", error);
    res.status(500).json({
      error: "Failed to sync leads dynamically",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
