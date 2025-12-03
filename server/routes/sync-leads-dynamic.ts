/**
 * API Route: POST /api/sync-leads-dynamic
 * Syncs leads with ALL columns from Google Sheets to Supabase database
 * Preserves exact column names from the sheet and existing assignments
 */

import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import { sanitizeValue, isValidEmail } from "../../shared/googleSheets";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

interface DateRowMarker {
  _isDateRow: string | boolean;
  _dateValue: string;
}

interface DynamicLeadRequest {
  leads: Array<{ [key: string]: string | number | undefined }>;
  dateRows?: DateRowMarker[];
  source: string;
  sheetId?: string;
}

/**
 * Parse date string and return ISO format or null if invalid
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Handle ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  const isoMatch = dateStr.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    // If only date part provided, add midnight time
    if (dateStr.length === 10) {
      return `${dateStr}T00:00:00.000Z`;
    }
    // If full ISO string, use as-is
    if (dateStr.includes("T")) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  return null;
}

export const handleSyncLeadsDynamic: RequestHandler = async (req, res) => {
  try {
    const { leads, dateRows, source, sheetId } = req.body as DynamicLeadRequest;

    console.log(
      "Dynamic sync request received with leads:",
      leads.length,
      "from sheet:",
      sheetId,
    );
    console.log("Sheet ID received:", sheetId, "Type:", typeof sheetId);
    console.log("[SYNC DEBUG] Full request body keys:", Object.keys(req.body));
    if (req.body.sheetId === undefined) {
      console.warn(
        "[SYNC DEBUG] WARNING: sheetId is undefined in request body!",
      );
    }
    console.log("[SYNC DEBUG] Supabase URL configured:", !!supabaseUrl);
    console.log("[SYNC DEBUG] Supabase Key configured:", !!supabaseKey);
    if (dateRows && dateRows.length > 0) {
      console.log("[SYNC DEBUG] Date rows received:", dateRows.length);
      console.log("[SYNC DEBUG] Sample date rows:", dateRows.slice(0, 3));
    }
    if (leads.length > 0) {
      console.log("First lead sample:", leads[0]);
      console.log("Available columns:", Object.keys(leads[0]));
      if (leads[0].created_at) {
        console.log(
          "[SYNC DEBUG] First lead has created_at:",
          leads[0].created_at,
        );
      }
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
          const normalizedKey = key
            .toLowerCase()
            .trim()
            .replace(/[\s_]+/g, "_") // Replace all spaces and underscores with single underscore
            .replace(/[-–!?]/g, ""); // Remove special characters
          const strValue = String(value || "").trim();

          if (!strValue) continue; // Skip empty values

          // Look for name column - be very flexible with matching
          if (
            !nameValue &&
            !normalizedKey.includes("email") &&
            !normalizedKey.includes("phone") &&
            !normalizedKey.includes("bill") &&
            !normalizedKey.includes("address") &&
            !normalizedKey.includes("code") &&
            !normalizedKey.includes("status") &&
            !normalizedKey.includes("note")
          ) {
            // If key contains "name" or "full" or is just a generic first column, treat as name
            if (
              normalizedKey.includes("name") ||
              normalizedKey.includes("full") ||
              normalizedKey === "c" ||
              normalizedKey === "c:" ||
              key.trim().match(/^[A-Z]$/) // Single letter column
            ) {
              nameValue = strValue;
            }
          }

          // Look for email - prioritize columns with "email"
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
              normalizedKey.includes("mobile") ||
              normalizedKey.includes("telephone")) &&
            strValue
          ) {
            phoneValue = strValue;
          }
        }

        const nonEmptyFields = Object.values(lead).filter(
          (v) => v !== undefined && v !== null && String(v).trim() !== "",
        ).length;

        // Validation: require name and email (email required for upsert constraint, phone is optional)
        // Be more lenient - if it has a name and email, it's valid
        const isValid =
          nameValue &&
          nameValue.length > 0 &&
          emailValue &&
          emailValue.length > 0;

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
      // Provide detailed debugging info
      const sampleRows = leads.slice(0, 3).map((lead) => {
        const cleaned: any = {};
        for (const [k, v] of Object.entries(lead)) {
          if (v && String(v).trim()) cleaned[k] = String(v).substring(0, 50);
        }
        return cleaned;
      });

      console.error("No valid leads after filtering:", {
        totalRows: leads.length,
        sampleRows,
        requiredFields: "name and email (phone is optional)",
      });

      res.status(400).json({
        error:
          "No valid leads found - ensure rows have Name and Email columns. Phone is optional.",
        totalRowsFetched: leads.length,
        sampleDebug: sampleRows.length > 0 ? sampleRows[0] : null,
        hint: "Each row must have a Name (or Full Name) and Email address. Check your Google Sheet structure.",
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

      // First pass: find critical fields (name, email, phone)
      let foundName = false;
      let foundEmail = false;
      let foundPhone = false;

      // Second pass: assign column values
      for (const [key, value] of Object.entries(lead)) {
        const normalizedKey = key
          .toLowerCase()
          .trim()
          .replace(/[\s_]+/g, "_") // Replace all spaces and underscores with single underscore
          .replace(/[-–!?]/g, ""); // Remove special characters

        // Ensure all values are properly formatted and sanitized
        const formattedValue = sanitizeValue(value);

        if (!formattedValue) continue;

        // Map common column name variations
        let dbColumn = "";

        if (
          !foundName &&
          (normalizedKey.includes("full_name") ||
            normalizedKey.includes("fullname") ||
            (normalizedKey.includes("name") &&
              !normalizedKey.includes("email")))
        ) {
          dbColumn = "name";
          foundName = true;
        } else if (!foundEmail && normalizedKey.includes("email")) {
          dbColumn = "email";
          foundEmail = true;
        } else if (
          !foundPhone &&
          (normalizedKey.includes("phone") ||
            normalizedKey.includes("contact") ||
            normalizedKey.includes("mobile"))
        ) {
          dbColumn = "phone";
          foundPhone = true;
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
          normalizedKey.includes("zip") ||
          normalizedKey.includes("code")
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
          normalizedKey.includes("avg") ||
          (normalizedKey.includes("current") &&
            normalizedKey.includes("electricity")) ||
          (normalizedKey.includes("your") &&
            (normalizedKey.includes("monthly") ||
              normalizedKey.includes("electricity") ||
              normalizedKey.includes("bill"))) ||
          (normalizedKey.includes("monthly") && normalizedKey.includes("bill"))
        ) {
          dbColumn = "avg_monthly_bill";
        } else if (
          normalizedKey.includes("electricity") ||
          (normalizedKey.includes("bill") &&
            !normalizedKey.includes("monthly") &&
            !normalizedKey.includes("avg"))
        ) {
          dbColumn = "electricity_bill";
        } else if (
          (normalizedKey.includes("note") ||
            normalizedKey.includes("feedback")) &&
          (normalizedKey.includes("1") || normalizedKey.endsWith("_1"))
        ) {
          dbColumn = "note1";
        } else if (
          (normalizedKey.includes("note") ||
            normalizedKey.includes("feedback")) &&
          (normalizedKey.includes("2") || normalizedKey.endsWith("_2"))
        ) {
          dbColumn = "note2";
        } else if (normalizedKey.includes("whatsapp")) {
          dbColumn = "whatsapp_follow_up";
        }

        // Only add column if it exists in Supabase schema and has a mapped name
        if (dbColumn && allowedColumns.has(dbColumn)) {
          syncData[dbColumn] = formattedValue;
        }
      }

      // Ensure required fields exist and are not empty
      syncData.name = sanitizeValue(syncData.name || "") || "Unknown";
      syncData.email = sanitizeValue(syncData.email || "");
      syncData.phone = sanitizeValue(syncData.phone || "");
      syncData.company = sanitizeValue(syncData.company || "");
      syncData.status = sanitizeValue(syncData.status || "Not lifted");
      // Note: Don't set assigned_to here - we'll preserve it from existing records

      // Sanitize optional fields
      if (syncData.note1) syncData.note1 = sanitizeValue(syncData.note1);
      if (syncData.note2) syncData.note2 = sanitizeValue(syncData.note2);
      if (syncData.street_address) syncData.street_address = sanitizeValue(syncData.street_address);
      if (syncData.post_code) syncData.post_code = sanitizeValue(syncData.post_code);
      if (syncData.lead_status) syncData.lead_status = sanitizeValue(syncData.lead_status);
      if (syncData.electricity_bill) syncData.electricity_bill = sanitizeValue(syncData.electricity_bill);
      if (syncData.type_of_property) syncData.type_of_property = sanitizeValue(syncData.type_of_property);
      if (syncData.avg_monthly_bill) syncData.avg_monthly_bill = sanitizeValue(syncData.avg_monthly_bill);

      // Set timestamps to ensure they're properly recorded
      const now = new Date().toISOString();

      // If created_at was provided (e.g., from date row), preserve it
      if (!syncData.created_at) {
        syncData.created_at = now;
      } else {
        console.log(
          "[SYNC DEBUG] Lead already has created_at:",
          syncData.created_at,
        );
      }

      syncData.updated_at = syncData.updated_at || now;

      // Set sheet_id so leads are associated with correct sheet
      // Ensure we use the actual sheetId, not default to "0"
      if (!sheetId || sheetId === "undefined") {
        console.warn("[SYNC DEBUG] WARNING: sheetId is missing or undefined!");
      }
      syncData.sheet_id = String(sheetId || "0");

      return syncData;
    });

    console.log("Attempting to sync leads to Supabase...");
    console.log("Total leads to sync:", leadsToSync.length);
    console.log("Sample lead:", leadsToSync[0]);
    console.log("Sample lead sheet_id:", leadsToSync[0].sheet_id);
    console.log("Columns:", Object.keys(leadsToSync[0]));

    try {
      // Pre-check: Fetch existing leads for this sheet to preserve assignments
      console.log("Checking for existing leads to preserve assignments...");
      const { data: existingLeads } = await supabase
        .from("leads")
        .select("email, assigned_to, id, sheet_id")
        .eq("sheet_id", sheetId);

      const existingEmails = new Set(
        (existingLeads || []).map((lead: any) => lead.email),
      );
      const existingAssignments = new Map(
        (existingLeads || []).map((lead: any) => [
          lead.email,
          lead.assigned_to,
        ]),
      );

      console.log(
        `Found ${existingEmails.size} existing leads for sheet ${sheetId}`,
      );

      // Separate leads into new and existing (for this sheet only)
      const newLeads = leadsToSync.filter(
        (lead) => !existingEmails.has(lead.email),
      );
      const existingLeadsToUpdate = leadsToSync.filter((lead) =>
        existingEmails.has(lead.email),
      );

      console.log(
        `${newLeads.length} new leads, ${existingLeadsToUpdate.length} leads to update`,
      );

      // Preserve existing assignments for leads that are being updated
      // Remove sheet_id from update data since it's immutable
      const leadsToUpdateWithPreservedAssignments = existingLeadsToUpdate.map(
        (lead) => {
          const { sheet_id, ...leadWithoutSheetId } = lead;
          return {
            ...leadWithoutSheetId,
            assigned_to: existingAssignments.get(lead.email) || "Unassigned",
          };
        },
      );

      let insertCount = 0;
      let updateCount = 0;
      let failureCount = 0;

      // First, try to insert new records
      if (newLeads.length > 0) {
        console.log("Inserting new leads into Supabase...");
        const { data, error } = await supabase
          .from("leads")
          .insert(newLeads)
          .select();

        if (!error) {
          insertCount = data?.length || newLeads.length;
          console.log(`✓ Inserted ${insertCount} new leads`);
        } else {
          console.warn(`Failed to insert ${newLeads.length} new leads:`, error);
          failureCount += newLeads.length;
        }
      }

      // Update each existing lead (preserving assignments)
      console.log("Updating existing leads...");
      for (const lead of leadsToUpdateWithPreservedAssignments) {
        const email = lead.email;

        if (email && String(email).trim()) {
          const updateData = {
            ...lead,
            updated_at: new Date().toISOString(),
          };

          const { error: updateError } = await supabase
            .from("leads")
            .update(updateData)
            .eq("email", email)
            .eq("sheet_id", sheetId);

          if (!updateError) {
            updateCount++;
          } else {
            failureCount++;
            console.warn(
              `Failed to update lead with email ${email} in sheet ${sheetId}:`,
              updateError,
            );
          }
        }
      }

      console.log(
        `Sync complete: ${insertCount} new, ${updateCount} updated, ${failureCount} failed`,
      );

      res.json({
        success: true,
        message: `Successfully synced ${updateCount + insertCount} leads${failureCount > 0 ? ` (${failureCount} failed)` : ""} (${leads.length - leadsToSync.length} empty rows removed)`,
        synced: updateCount + insertCount,
        newLeads: insertCount,
        updatedLeads: updateCount,
        failed: failureCount,
        totalFetched: leads.length,
        emptyRowsRemoved: leads.length - leadsToSync.length,
        source: source,
        columnsIncluded: Object.keys(leadsToSync[0]),
      });
    } catch (err) {
      console.error("Error during sync operation:", err);
      res.status(500).json({
        error: "Failed to sync leads",
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
