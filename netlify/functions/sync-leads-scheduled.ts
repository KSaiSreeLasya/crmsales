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

  return (
    nameValue &&
    String(nameValue).trim().length > 0 &&
    phoneValue &&
    String(phoneValue).trim().length > 0
  );
};

const normalizeLeadData = (lead: any): any => {
  // Create normalized keys mapping
  const normalized: any = {
    source: "google_sheet",
    sheet_id: SHEET_ID,
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
  console.log("[SCHEDULED] Starting daily Google Sheets sync...");
  console.log(`[SCHEDULED] Timestamp: ${new Date().toISOString()}`);

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

    // Fetch from Google Sheets
    console.log(`[SCHEDULED] Fetching from Google Sheet: ${SPREADSHEET_ID}`);
    const rows = await fetchGoogleSheet(SPREADSHEET_ID, SHEET_ID);
    result.totalFetched = rows.length;
    console.log(`[SCHEDULED] Fetched ${rows.length} rows from Google Sheet`);

    if (rows.length === 0) {
      result.message = "No rows found in Google Sheet";
      console.warn("[SCHEDULED]", result.message);
      return {
        statusCode: 200,
        body: JSON.stringify(result),
      };
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
      .map((row) => normalizeLeadData(row));

    console.log(
      `[SCHEDULED] Valid leads after validation: ${leadsToSync.length}`,
    );

    if (leadsToSync.length === 0) {
      result.message = "No valid leads found (requires name and phone number)";
      console.warn("[SCHEDULED]", result.message);
      return {
        statusCode: 200,
        body: JSON.stringify(result),
      };
    }

    // Attempt to insert leads
    console.log(
      `[SCHEDULED] Attempting to insert/update ${leadsToSync.length} leads...`,
    );

    try {
      const { data, error } = await supabase
        .from("leads")
        .insert(leadsToSync)
        .select();

      if (!error) {
        // All inserted successfully
        result.success = true;
        result.synced = leadsToSync.length;
        result.message = `Successfully synced ${leadsToSync.length} new leads`;
        console.log(`[SCHEDULED] ✓ ${result.message}`);
      } else if (
        error.message?.includes("duplicate") ||
        (error as any).code === "23505"
      ) {
        // Duplicate key error - use batch upsert instead of sequential updates
        console.log(
          `[SCHEDULED] Duplicate key detected, attempting batch upsert...`,
        );

        try {
          // Prepare data for upsert with updated_at timestamp
          const upsertData = leadsToSync.map((lead) => ({
            ...lead,
            updated_at: new Date().toISOString(),
          }));

          // Batch upsert all leads at once (much faster than sequential updates)
          const { data: upsertResult, error: upsertError } = await supabase
            .from("leads")
            .upsert(upsertData, {
              onConflict: "email",
              ignoreDuplicates: false,
            })
            .select();

          if (upsertError) {
            result.message = `Failed to upsert leads: ${upsertError.message}`;
            result.errors = [upsertError.message];
            console.error(`[SCHEDULED] ✗ ${result.message}`);
          } else {
            result.success = true;
            result.updated = upsertResult?.length || leadsToSync.length;
            result.message = `Successfully upserted ${result.updated} leads`;
            console.log(`[SCHEDULED] ✓ ${result.message}`);
          }
        } catch (upsertErr) {
          const errorMsg =
            upsertErr instanceof Error ? upsertErr.message : String(upsertErr);
          result.message = `Error during batch upsert: ${errorMsg}`;
          result.errors = [errorMsg];
          console.error(`[SCHEDULED] ✗ ${result.message}`);
        }
      } else {
        // Other error
        result.message = `Failed to sync leads: ${error.message}`;
        result.errors = [error.message];
        console.error(`[SCHEDULED] ✗ ${result.message}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      result.message = `Error during sync: ${errorMsg}`;
      result.errors = [errorMsg];
      console.error(`[SCHEDULED] ✗ ${result.message}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.message = `Scheduled sync failed: ${errorMsg}`;
    result.errors = [errorMsg];
    console.error(`[SCHEDULED] ✗ ${result.message}`);
  }

  const statusCode = result.success || result.updated > 0 ? 200 : 500;
  return {
    statusCode,
    body: JSON.stringify(result),
  };
};
