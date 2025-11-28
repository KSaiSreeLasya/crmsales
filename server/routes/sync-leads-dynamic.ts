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
    console.log("[SYNC DEBUG] Supabase URL configured:", !!supabaseUrl);
    console.log("[SYNC DEBUG] Supabase Key configured:", !!supabaseKey);
    if (leads.length > 0) {
      console.log("First lead sample:", leads[0]);
      console.log("Available columns:", Object.keys(leads[0]));
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      res.status(400).json({ error: "No leads provided" });
      return;
    }

    // For dynamic sync, validate that rows have meaningful data
    // More lenient validation - just need some basic info
    const validLeads = leads
      .map((lead, index) => {
        let nameValue = "";
        let emailValue = "";
        let phoneValue = "";

        // Find name, email, phone across all columns with flexible matching
        for (const [key, value] of Object.entries(lead)) {
          const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
          const strValue = String(value || "").trim();

          // Look for name column (but not full_name as a strict match, be flexible)
          if (
            !nameValue &&
            (normalizedKey.includes("name") ||
              normalizedKey.includes("full")) &&
            !normalizedKey.includes("email") &&
            strValue
          ) {
            nameValue = strValue;
          }

          // Look for email
          if (
            !emailValue &&
            (normalizedKey.includes("email") ||
              normalizedKey.includes("mail")) &&
            strValue
          ) {
            emailValue = strValue;
          }

          // Look for phone
          if (
            !phoneValue &&
            (normalizedKey.includes("phone") ||
              normalizedKey.includes("contact") ||
              normalizedKey.includes("phone_no") ||
              normalizedKey.includes("mobile")) &&
            strValue
          ) {
            phoneValue = strValue;
          }
        }

        const nonEmptyFields = Object.values(lead).filter(
          (v) => v !== undefined && v !== null && String(v).trim() !== "",
        ).length;

        // Validation: require name, email, and phone (email required for upsert constraint)
        const isValid =
          nonEmptyFields >= 2 &&
          nameValue &&
          nameValue.length > 0 &&
          emailValue &&
          emailValue.length > 0 &&
          phoneValue &&
          phoneValue.length > 0;

        if (!isValid && index < 5) {
          console.log(`[VALIDATION] Row ${index} rejected:`, {
            nameValue,
            emailValue,
            phoneValue,
            nonEmptyFields,
            allKeys: Object.keys(lead),
          });
        }

        return { lead, isValid, nameValue, emailValue, phoneValue };
      })
      .filter((item) => item.isValid)
      .map((item) => item.lead);

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
      const syncData: any = {
        source: source || "google_sheet",
        sheet_id: sheetId || "0",
      };

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

      // Ensure required fields exist and are not empty
      syncData.name = (syncData.name || "").trim() || "Unknown";
      syncData.email = (syncData.email || "").trim();
      syncData.phone = (syncData.phone || "").trim() || "";
      syncData.company = (syncData.company || "").trim() || "";
      syncData.status = syncData.status || "Not lifted";
      syncData.assigned_to = syncData.assigned_to || "Unassigned";

      // Set timestamps to ensure they're properly recorded
      const now = new Date().toISOString();
      syncData.created_at = syncData.created_at || now;
      syncData.updated_at = syncData.updated_at || now;

      // Set sheet_id so leads are associated with correct sheet
      syncData.sheet_id = sheetId || "0";

      console.log("[SYNC DEBUG] Normalized lead:", JSON.stringify(syncData));

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
      console.log(
        "[SYNC DEBUG] Attempting to insert",
        leadsToSync.length,
        "leads",
      );
      console.log(
        "[SYNC DEBUG] Sample lead:",
        JSON.stringify(leadsToSync[0], null, 2),
      );

      const { data, error } = await supabase
        .from("leads")
        .insert(leadsToSync)
        .select();

      if (error) {
        console.error("[SYNC ERROR] Supabase insert error:", error);
        console.error(
          "[SYNC ERROR] Full error object:",
          JSON.stringify(error, null, 2),
        );
        console.error("[SYNC ERROR] Error code:", (error as any).code);
        console.error("[SYNC ERROR] Error hint:", (error as any).hint);
        console.error("[SYNC ERROR] Error details:", (error as any).details);

        // If duplicate key error, try updating existing records
        if (
          error.message?.includes("duplicate") ||
          (error as any).code === "23505"
        ) {
          console.log(
            "Duplicate key detected, updating existing records...",
          );

          try {
            let updateCount = 0;
            let failureCount = 0;

            // Update each lead by email
            for (const lead of leadsToSync) {
              const email = lead.email;

              if (email && String(email).trim()) {
                const updateData = {
                  ...lead,
                  updated_at: new Date().toISOString(),
                };

                const { error: updateError } = await supabase
                  .from("leads")
                  .update(updateData)
                  .eq("email", email);

                if (!updateError) {
                  updateCount++;
                } else {
                  failureCount++;
                  console.warn(
                    `Failed to update lead with email ${email}:`,
                    updateError,
                  );
                }
              }
            }

            console.log(
              `��� Updated ${updateCount} leads successfully, ${failureCount} failed`,
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
              error: "Failed to update leads",
              message:
                updateErr instanceof Error
                  ? updateErr.message
                  : String(updateErr),
            });
            return;
          }
        }

        // For other errors, return details
        console.error("[SYNC ERROR] Detailed error info:");
        console.error("  Code:", (error as any).code);
        console.error("  Hint:", (error as any).hint);
        console.error("  Details:", (error as any).details);
        console.error("  Status:", (error as any).status);

        res.status(400).json({
          error: "Failed to insert leads",
          message: error.message,
          details: (error as any).details,
          code: (error as any).code,
          hint:
            (error as any).hint ||
            "Ensure Supabase credentials are configured and RLS is not blocking inserts",
          troubleshooting: {
            checkUrl: "Visit /api/test-supabase to verify Supabase connection",
            checkEnv:
              "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set",
            checkRLS: "Verify RLS policies are not blocking INSERT operations",
          },
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
