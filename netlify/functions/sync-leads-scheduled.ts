/**
 * Scheduled Lead Sync Function
 *
 * Runs daily at 2:00 AM UTC to sync leads from Google Sheets to Supabase
 * Schedule: 0 2 * * * (cron format)
 *
 * To change the time, update netlify.toml:
 * - Change "0 2 * * *" to your desired cron expression
 * - Common examples:
 *   - "0 6 * * *" = 6:00 AM UTC (India Standard Time: 11:30 AM IST)
 *   - "30 5 * * *" = 5:30 AM UTC (India Standard Time: 11:00 AM IST)
 *   - "0 23 * * *" = 11:00 PM UTC (India Standard Time: 4:30 AM IST next day)
 *
 * Features:
 * - Automatically discovers and syncs all sheets from Google Sheets
 * - New sheets are synced automatically without code changes
 * - Preserves existing lead assignments during sync
 * - Handles duplicate leads by updating existing records
 * - Logs all sync operations for debugging
 * - Returns detailed sync report with success/failure counts
 * - Validation: Requires name and email (phone is optional for consistency with sync-leads-dynamic.ts)
 * - Excludes archive, template, and system sheets from sync
 */

import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import {
  fetchGoogleSheet,
  parseRowDynamic,
  getSheetsList,
  filterSheetsForSync,
} from "../../shared/googleSheets";

const SPREADSHEET_ID = "1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

interface SyncResult {
  success: boolean;
  synced: number;
  updated: number;
  failed: number;
  totalFetched: number;
  message: string;
  timestamp: string;
  errors?: string[];
}

const validateLead = (lead: any): boolean => {
  // Use flexible name matching to handle column name variations
  let nameValue = "";
  let emailValue = "";

  for (const [key, value] of Object.entries(lead)) {
    const strValue = String(value || "").trim();
    if (!strValue) continue;

    const normalizedKey = key
      .toLowerCase()
      .trim()
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

  // Email is required for upsert (unique constraint)
  // Name is required for meaningful records
  // Phone is optional (sync-leads-dynamic.ts also makes it optional for consistency)
  return (
    nameValue && nameValue.length > 0 && emailValue && emailValue.length > 0
  );
};

const normalizeLeadData = (lead: any, sheetId: string): any => {
  // Use flexible name matching to map all column variations to Supabase schema
  const normalized: any = {
    source: "google_sheet",
    sheet_id: sheetId,
  };

  // Helper to find and map columns
  const mapColumn = (patterns: string[]): string => {
    for (const [key, value] of Object.entries(lead)) {
      if (!value) continue;

      const normalizedKey = key
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, "_")
        .replace(/[-–!?]/g, "");

      for (const pattern of patterns) {
        const normalizedPattern = pattern
          .toLowerCase()
          .trim()
          .replace(/[\s_]+/g, "_")
          .replace(/[-–!?]/g, "");

        if (
          normalizedKey === normalizedPattern ||
          normalizedKey.includes(normalizedPattern) ||
          normalizedPattern.includes(normalizedKey)
        ) {
          return String(value).trim();
        }
      }
    }
    return "";
  };

  // Map all columns with flexible name matching
  normalized.name = mapColumn(["full name", "full_name", "name"]) || "";
  normalized.email = mapColumn(["email", "email_address"]) || "";
  normalized.phone = mapColumn(["phone", "phone_no", "phone_number"]) || "";
  normalized.company = mapColumn(["company"]) || "";
  normalized.street_address =
    mapColumn(["street address", "street_address", "street", "address"]) || "";
  normalized.post_code =
    mapColumn(["post_code", "postal_code", "postcode", "zip_code"]) || "";
  normalized.lead_status = mapColumn(["lead_status", "status"]) || "";
  normalized.type_of_property =
    mapColumn([
      "what_type_of_property_do_you_want_to_install_solar_on",
      "type_of_property",
      "property_type",
    ]) || "";

  const avgBill =
    mapColumn([
      "electricity_bill",
      "what_is_your_average_monthly_electricity_bill",
      "average_monthly_electricity_bill",
      "monthly_electricity_bill",
    ]) || "";

  normalized.avg_monthly_bill = avgBill;
  normalized.electricity_bill = avgBill;

  // Set defaults for fields not in sheet
  normalized.status = "Not lifted";
  normalized.assigned_to = "Unassigned";

  return normalized;
};

export const handler: Handler = async (event) => {
  console.log(
    "[SCHEDULED] Starting Google Sheets sync (daily at 2:00 AM UTC)...",
  );
  console.log(`[SCHEDULED] Execution timestamp: ${new Date().toISOString()}`);

  const result: SyncResult = {
    success: false,
    synced: 0,
    updated: 0,
    failed: 0,
    totalFetched: 0,
    message: "",
    timestamp: new Date().toISOString(),
    errors: [],
  };

  try {
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseKey) {
      result.message = "Supabase credentials not configured";
      console.error("[SCHEDULED]", result.message);
      return {
        statusCode: 500,
        body: JSON.stringify(result),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Dynamically fetch sheets from the spreadsheet
    let sheetsToSync: Array<{ id: string; name: string }>;
    try {
      const allSheets = await getSheetsList(SPREADSHEET_ID);
      sheetsToSync = filterSheetsForSync(allSheets);
      console.log(
        `[SCHEDULED] Found ${sheetsToSync.length} sheets to sync: ${sheetsToSync.map((s) => s.name).join(", ")}`,
      );
    } catch (error) {
      console.warn(
        "[SCHEDULED] Failed to fetch sheets dynamically, falling back to default sheets",
        error,
      );
      // Fallback to default sheets if dynamic fetch fails
      sheetsToSync = [
        { id: "0", name: "October" },
        { id: "1892152973", name: "November" },
        { id: "1355430272", name: "December" },
      ];
    }

    // Sync all detected sheets
    for (const sheet of sheetsToSync) {
      const sheetId = sheet.id;
      const sheetName = sheet.name;

      try {
        console.log(
          `[SCHEDULED] Syncing ${sheetName} sheet (ID: ${sheetId})...`,
        );

        // Fetch from Google Sheets
        const rows = await fetchGoogleSheet(SPREADSHEET_ID, sheetId);
        console.log(
          `[SCHEDULED] Fetched ${rows.length} rows from ${sheetName} sheet`,
        );

        if (rows.length === 0) {
          console.warn(
            `[SCHEDULED] No rows found in ${sheetName} sheet, skipping...`,
          );
          continue;
        }

        // Filter out date rows
        const dataRows = rows.filter((row) => {
          return !(row._isDateRow === "true" || row._isDateRow === true);
        });

        console.log(
          `[SCHEDULED] Data rows: ${dataRows.length}, Date rows: ${rows.length - dataRows.length}`,
        );

        // Validate and normalize leads
        const leadsToSync = dataRows
          .filter((row) => validateLead(row))
          .map((row) => normalizeLeadData(row, sheetId));

        console.log(
          `[SCHEDULED] Valid leads from ${sheetName}: ${leadsToSync.length}`,
        );

        if (leadsToSync.length === 0) {
          console.warn(
            `[SCHEDULED] No valid leads found in ${sheetName} sheet`,
          );
          continue;
        }

        // Attempt to insert leads
        console.log(
          `[SCHEDULED] Attempting to insert/update ${leadsToSync.length} leads from ${sheetName}...`,
        );

        try {
          const { data, error } = await supabase
            .from("leads")
            .insert(leadsToSync)
            .select();

          if (!error) {
            // All inserted successfully
            result.success = true;
            result.synced += leadsToSync.length;
            console.log(
              `[SCHEDULED] ✓ Inserted ${leadsToSync.length} new leads from ${sheetName}`,
            );
          } else if (
            error.message?.includes("duplicate") ||
            (error as any).code === "23505"
          ) {
            // Duplicate key error - update existing records
            console.log(
              `[SCHEDULED] Duplicate key detected in ${sheetName}, updating existing records...`,
            );

            try {
              // Fetch existing assignments to preserve them during update
              const { data: existingLeads } = await supabase
                .from("leads")
                .select("email, assigned_to, sheet_id")
                .eq("sheet_id", sheetId);

              const existingAssignments = new Map(
                (existingLeads || []).map((lead: any) => [
                  lead.email,
                  lead.assigned_to,
                ]),
              );

              let updateCount = 0;
              let failureCount = 0;

              // Update each lead by email while preserving assignments
              for (const lead of leadsToSync) {
                const email = lead.email;

                if (email && String(email).trim()) {
                  const { sheet_id, ...leadWithoutSheetId } = lead;
                  const updateData = {
                    ...leadWithoutSheetId,
                    // Preserve existing assignment if it exists
                    assigned_to:
                      existingAssignments.get(email) || lead.assigned_to,
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
                      `[SCHEDULED] Failed to update lead with email ${email} in sheet ${sheetId}:`,
                      updateError,
                    );
                  }
                }
              }

              result.success = updateCount > 0;
              result.updated += updateCount;
              result.failed += failureCount;
              console.log(
                `[SCHEDULED] ✓ Updated ${updateCount} existing leads from ${sheetName}, ${failureCount} failed`,
              );
            } catch (updateErr) {
              const errorMsg =
                updateErr instanceof Error
                  ? updateErr.message
                  : String(updateErr);
              console.error(
                `[SCHEDULED] Update error for ${sheetName}:`,
                errorMsg,
              );
              result.failed += leadsToSync.length;
              result.errors?.push(`${sheetName} update error: ${errorMsg}`);
            }
          } else {
            // Other error
            console.error(
              `[SCHEDULED] Failed to sync ${sheetName} leads:`,
              error.message,
            );
            result.failed += leadsToSync.length;
            result.errors?.push(`${sheetName}: ${error.message}`);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(
            `[SCHEDULED] Error syncing ${sheetName} leads:`,
            errorMsg,
          );
          result.failed += leadsToSync.length;
          result.errors?.push(`${sheetName} error: ${errorMsg}`);
        }
      } catch (sheetError) {
        const errorMsg =
          sheetError instanceof Error ? sheetError.message : String(sheetError);
        console.error(
          `[SCHEDULED] Error processing ${sheetName} sheet:`,
          errorMsg,
        );
        result.errors?.push(`${sheetName} sheet error: ${errorMsg}`);
      }
    }

    result.totalFetched = result.synced + result.updated;
    result.message =
      result.synced > 0 || result.updated > 0
        ? `✓ Synced ${result.synced} new, updated ${result.updated} existing leads (${result.failed} failed)`
        : "ℹ No new leads found in any sheets";

    if (result.failed > 0) {
      result.message += ` - Some errors occurred: ${result.errors?.join("; ") || "See logs"}`;
    }

    console.log(`[SCHEDULED] ${result.message}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.message = `Scheduled sync failed: ${errorMsg}`;
    result.errors = [errorMsg];
    console.error(`[SCHEDULED] ✗ ${result.message}`);
  }

  const statusCode =
    result.success || result.synced > 0 || result.updated > 0 ? 200 : 500;
  return {
    statusCode,
    body: JSON.stringify(result),
  };
};
