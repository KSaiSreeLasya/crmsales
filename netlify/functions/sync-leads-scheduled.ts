import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { fetchGoogleSheet, parseRowDynamic } from "../../shared/googleSheets";

const SPREADSHEET_ID = "1QY8_Q8-ybLKNVs4hynPZslZDwUfC-PIJrViJfL0-tpM";
const SHEETS_TO_SYNC = [
  { id: "0", name: "October" },
  { id: "1892152973", name: "November" },
];

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
  const nameValue = lead.name || lead.Name || lead.full_name || lead.Full_Name;
  const phoneValue =
    lead.phone ||
    lead.Phone ||
    lead.phone_no ||
    lead.Phone_No ||
    lead.contact ||
    lead.Contact;
  const emailValue =
    lead.email || lead.Email || lead.email_address || lead.Email_Address;

  // Email is required for upsert (unique constraint)
  return (
    nameValue &&
    String(nameValue).trim().length > 0 &&
    phoneValue &&
    String(phoneValue).trim().length > 0 &&
    emailValue &&
    String(emailValue).trim().length > 0
  );
};

const normalizeLeadData = (lead: any, sheetId: string): any => {
  // Create normalized keys mapping
  const normalized: any = {
    source: "google_sheet",
    sheet_id: sheetId,
  };

  // Normalize column names to match Supabase schema
  for (const [key, value] of Object.entries(lead)) {
    if (!value) continue;

    const normalizedKey = String(key)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[?]/g, "");
    const strValue = String(value).trim();

    // Map common variations
    if (normalizedKey.includes("full") && normalizedKey.includes("name")) {
      normalized.name = strValue;
    } else if (normalizedKey.includes("email")) {
      normalized.email = strValue;
    } else if (normalizedKey.includes("phone")) {
      normalized.phone = strValue;
    } else if (normalizedKey.includes("company")) {
      normalized.company = strValue;
    } else if (
      normalizedKey.includes("street") ||
      normalizedKey.includes("address")
    ) {
      normalized.street_address = strValue;
    } else if (
      normalizedKey.includes("post") ||
      normalizedKey.includes("postal") ||
      normalizedKey.includes("zip")
    ) {
      normalized.post_code = strValue;
    } else if (
      normalizedKey.includes("lead") &&
      normalizedKey.includes("status")
    ) {
      normalized.lead_status = strValue;
    } else if (
      normalizedKey.includes("type") &&
      normalizedKey.includes("property")
    ) {
      normalized.type_of_property = strValue;
    } else if (
      normalizedKey.includes("avg") &&
      normalizedKey.includes("monthly")
    ) {
      normalized.avg_monthly_bill = strValue;
    } else if (
      normalizedKey.includes("electricity") ||
      (normalizedKey.includes("bill") && !normalizedKey.includes("monthly"))
    ) {
      normalized.electricity_bill = strValue;
    } else if (normalizedKey.includes("note") && normalizedKey.includes("1")) {
      normalized.note1 = strValue;
    } else if (normalizedKey.includes("note") && normalizedKey.includes("2")) {
      normalized.note2 = strValue;
    }
  }

  // Ensure required fields
  normalized.name = normalized.name || "";
  normalized.email = normalized.email || "";
  normalized.phone = normalized.phone || "";
  normalized.company = normalized.company || "";
  normalized.status = "Not lifted";
  normalized.assigned_to = "Unassigned";

  return normalized;
};

export const handler: Handler = async (event) => {
  console.log("[SCHEDULED] Starting Google Sheets sync (daily at 2:00 AM UTC)...");
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

    // Sync both October and November sheets
    for (const sheet of SHEETS_TO_SYNC) {
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
                .select("email, assigned_to");

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
                  const updateData = {
                    ...lead,
                    // Preserve existing assignment if it exists
                    assigned_to:
                      existingAssignments.get(email) || lead.assigned_to,
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
                      `[SCHEDULED] Failed to update lead with email ${email}:`,
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
