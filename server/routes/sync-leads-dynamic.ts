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
    const {
      leads,
      dateRows,
      source,
      sheetId: rawSheetId,
    } = req.body as DynamicLeadRequest;

    // Ensure sheetId is properly converted to string and logged
    const sheetId = String(rawSheetId || "0");

    console.log(
      "Dynamic sync request received with leads:",
      leads.length,
      "from sheet:",
      sheetId,
    );
    console.log("[SYNC DEBUG] Raw sheetId from request:", rawSheetId);
    console.log("[SYNC DEBUG] Converted sheetId:", sheetId);
    console.log("[SYNC DEBUG] sheetId Type:", typeof sheetId);
    console.log("[SYNC DEBUG] Full request body keys:", Object.keys(req.body));
    console.log(
      "[SYNC DEBUG] Full request body:",
      JSON.stringify(req.body, null, 2).substring(0, 500),
    );
    if (req.body.sheetId === undefined) {
      console.warn(
        "[SYNC DEBUG] WARNING: sheetId is undefined in request body!",
      );
    } else {
      console.log("[SYNC DEBUG] sheetId was provided in request body");
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
      console.log("Column count:", Object.keys(leads[0]).length);

      // Show first few column values to debug
      const columnPreview: any = {};
      Object.keys(leads[0])
        .slice(0, 10)
        .forEach((key) => {
          const val = String(leads[0][key] || "").trim();
          columnPreview[key] = val.substring(0, 50);
        });
      console.log("Column preview:", columnPreview);

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

    // For dynamic sync, accept rows with any meaningful data
    // Flexible validation: allow November sheet and others with non-standard columns
    const validLeads = leads.filter((lead) => {
      // Accept any row that has at least one non-empty column value
      const hasData = Object.values(lead).some((value) => {
        const strValue = String(value || "").trim();
        return strValue.length > 0;
      });
      return hasData;
    });

    console.log("Valid leads after filtering:", validLeads.length);
    console.log(
      "Filtered out empty/sparse rows:",
      leads.length - validLeads.length,
    );
    if (validLeads.length > 0) {
      console.log("First valid lead:", validLeads[0]);
      console.log("Columns in first lead:", Object.keys(validLeads[0]));
      console.log("[SYNC DEBUG] Sample data from CSV:");
      validLeads.slice(0, 3).forEach((lead, idx) => {
        console.log(`  Row ${idx}:`, {
          name: lead["full name"] || lead["Full Name"] || "",
          email: lead.email || lead.Email || "",
          phone: lead.phone || lead.Phone || "",
          hasEmail: !!lead.email || !!lead.Email,
          allKeys: Object.keys(lead),
        });
      });
    }

    if (validLeads.length === 0) {
      // Provide detailed debugging info
      const sampleRows = leads.slice(0, 5).map((lead) => {
        const cleaned: any = {};
        for (const [k, v] of Object.entries(lead)) {
          const strVal = String(v || "").trim();
          if (strVal) {
            cleaned[k] = strVal.substring(0, 100);
          }
        }
        return cleaned;
      });

      console.error("No valid leads after filtering:", {
        totalRows: leads.length,
        sampleRows,
        firstRowKeys: leads.length > 0 ? Object.keys(leads[0]) : [],
        note: "No rows with data found - all rows appear to be empty",
      });

      // Also log which rows were considered empty
      const emptyRowsExample = leads.slice(0, 3).map((lead, idx) => {
        const fieldCount = Object.values(lead).filter(
          (v) => v && String(v).trim() !== "",
        ).length;
        return {
          index: idx,
          fieldCount,
          keys: Object.keys(lead).slice(0, 5),
          values: Object.values(lead)
            .slice(0, 5)
            .map((v) => String(v || "").substring(0, 30)),
        };
      });

      console.error("Empty row analysis:", emptyRowsExample);

      res.status(400).json({
        error:
          "No valid leads found - sheet appears to be empty or all rows have no data.",
        totalRowsFetched: leads.length,
        sampleDebug: sampleRows.length > 0 ? sampleRows.slice(0, 3) : null,
        hint: "Ensure your sheet has data in at least one column per row.",
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
    console.log(`[SYNC] Starting to map ${validLeads.length} leads...`);
    const leadsToSync = validLeads.map((lead, rowIndex) => {
      if (rowIndex === 0) {
        console.log(`[SYNC] Processing first lead, keys:`, Object.keys(lead));
        console.log(`[SYNC] First lead raw email value: "${lead.email}" (type: ${typeof lead.email})`);
      }
      const syncData: any = {
        source: source || "google_sheet",
        sheet_id: sheetId || "0",
      };

      // Helper function to find and map column values
      // This function searches through the lead object for values that match the given patterns
      const mapColumn = (patterns: string[]): string => {
        for (const [key, value] of Object.entries(lead)) {
          // Skip null/undefined values, but NOT empty strings (they might be valid columns)
          if (value === null || value === undefined) continue;

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
              // Return sanitized value, even if it's an empty string
              // Empty values will be caught by the caller's validation logic
              const sanitized = sanitizeValue(value);
              return sanitized;
            }
          }
        }
        return "";
      };

      // Map columns with flexible name matching
      syncData.name =
        mapColumn(["full name", "full_name", "name"]) || "Unknown";

      // Email is REQUIRED in database (NOT NULL UNIQUE)
      // Try multiple patterns to find email column with extended matching
      let emailValue = mapColumn([
        "email",
        "email_address",
        "email address",
        "e-mail",
        "e mail",
        "contact email",
      ]);

      // Ensure we have a non-empty, non-whitespace email value
      const emailTrimmed = String(emailValue || "").trim();
      const hasValidEmail = emailTrimmed.length > 0;

      // Debug: Log email extraction for first few rows
      if (rowIndex < 3) {
        console.log(`[SYNC DEBUG] Row ${rowIndex} email extraction:`, {
          emailValue,
          emailTrimmed,
          hasValidEmail,
          allKeys: Object.keys(lead),
          rawEmail: lead.email || lead.Email || lead["email"],
        });
      }

      // If email is not found or is empty/whitespace-only, generate synthetic email to ensure uniqueness
      if (!hasValidEmail) {
        const name = syncData.name || "unknown";
        const phoneRaw =
          mapColumn([
            "phone",
            "phone_no",
            "phone_number",
            "telephone",
            "contact phone",
          ]) || "";

        // Sanitize the phone value
        const phone = String(phoneRaw).trim();

        // Generate unique synthetic email
        const sanitizedName = String(name)
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ".")
          .replace(/[^a-z0-9.]/g, "");

        const sanitizedPhone = String(phone).replace(/\D/g, "").slice(-4);

        // Create a more unique suffix using timestamp and row index
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp for variation
        const uniqueSuffix = `${timestamp}${rowIndex.toString().padStart(4, "0")}`;

        // Build the synthetic email with better uniqueness
        const baseEmail = (sanitizedName || "unknown").substring(0, 40);
        const emailDomain = `${baseEmail}${sanitizedPhone ? "." + sanitizedPhone : ""}`;

        emailValue = `${emailDomain}.${uniqueSuffix}@synced-lead.local`
          .substring(0, 254)
          .toLowerCase();

        console.log(
          `[SYNC] Row ${rowIndex}: Generated synthetic email for lead "${name}" (phone: ${phone}): ${emailValue}`,
        );
      } else {
        console.log(
          `[SYNC] Row ${rowIndex}: Using email from sheet for lead "${syncData.name}": ${emailTrimmed}`,
        );
      }

      // Always use the sanitized, trimmed email value
      syncData.email = emailTrimmed || emailValue;

      // Explicit logging for every row to track what email is being assigned
      if (rowIndex < 5) {
        console.log(`[SYNC EXPLICIT] Row ${rowIndex}:`, {
          originalEmail: lead.email,
          emailTrimmed,
          emailValue,
          finalAssignedEmail: syncData.email,
          hasEmail: !!syncData.email,
        });
      }

      syncData.phone =
        mapColumn([
          "phone",
          "phone_no",
          "phone_number",
          "telephone",
          "contact phone",
        ]) || "N/A";

      syncData.company =
        mapColumn(["company", "organization", "business", "company name"]) ||
        "N/A";

      syncData.street_address =
        mapColumn(["street address", "street_address", "street", "address"]) ||
        "";
      syncData.post_code =
        mapColumn(["post_code", "postal_code", "postcode", "zip_code"]) || "";
      syncData.lead_status = mapColumn(["lead_status", "status"]) || "";
      syncData.electricity_bill =
        mapColumn([
          "electricity_bill",
          "what_is_your_average_monthly_electricity_bill",
          "average_monthly_electricity_bill",
          "monthly_electricity_bill",
          "avg_bill",
          "monthly_bill",
        ]) || "";
      syncData.type_of_property =
        mapColumn([
          "what_type_of_property_do_you_want_to_install_solar_on",
          "type_of_property",
          "property_type",
          "property",
        ]) || "";
      syncData.avg_monthly_bill = syncData.electricity_bill;
      syncData.status = "Not lifted";

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

    // Validate required fields and filter out invalid leads
    // Note: Email is now generated synthetically if missing
    // Phone and Company default to "N/A" which is acceptable
    // Name and Email are required (Email is either from sheet or synthetically generated)
    const validLeadsForSync = leadsToSync.filter((lead, idx) => {
      const name = lead.name || "";
      const email = lead.email || "";
      const trimmedName = String(name).trim();
      const trimmedEmail = String(email).trim();

      // Reject if name is empty/invalid
      if (
        trimmedName === "" ||
        trimmedName === "unknown" ||
        trimmedName === "Unknown"
      ) {
        console.warn(
          `[SYNC] Row ${idx} skipped - missing name. Data: "${JSON.stringify(lead).substring(0, 100)}"`,
        );
        return false;
      }

      // Reject if email is still empty after synthetic generation (this should NOT happen)
      if (trimmedEmail === "") {
        console.error(
          `[SYNC] Row ${idx} skipped - email is empty after processing. Lead: "${JSON.stringify(lead).substring(0, 150)}"`,
        );
        return false;
      }

      // All other fields are either populated from sheet or have sensible defaults
      return true;
    });

    if (validLeadsForSync.length === 0) {
      console.error(
        `[SYNC] All ${leadsToSync.length} leads were filtered out due to missing name field`,
      );
      console.error("[SYNC] Sample problematic lead:", leadsToSync[0]);

      res.status(400).json({
        error: "All leads were skipped - missing name (Full Name) field",
        hint: "Ensure your sheet has a column for: Full Name. Phone, Company, and Email will be generated/defaulted if missing.",
        totalProcessed: leadsToSync.length,
        validLeads: validLeadsForSync.length,
        sampleLead: leadsToSync[0],
      });
      return;
    }

    console.log("Attempting to sync leads to Supabase...");
    console.log("Total leads to sync:", validLeadsForSync.length);
    console.log("Target sheet_id for sync:", String(sheetId || "0"));
    if (validLeadsForSync.length > 0) {
      console.log("Sample lead:", validLeadsForSync[0]);
      console.log("Sample lead sheet_id:", validLeadsForSync[0].sheet_id);
      console.log("Sample lead name:", validLeadsForSync[0].name);
      console.log("Sample lead email:", validLeadsForSync[0].email);
      console.log("Columns in first lead:", Object.keys(validLeadsForSync[0]));

      // Verify all leads have the correct sheet_id
      const allHaveCorrectSheetId = validLeadsForSync.every(
        (lead) => lead.sheet_id === String(sheetId || "0"),
      );
      console.log(
        `[SYNC DEBUG] All leads have correct sheet_id (${String(sheetId || "0")}):`,
        allHaveCorrectSheetId,
      );

      // Count leads by sheet_id
      const sheetIdCounts: { [key: string]: number } = {};
      validLeadsForSync.forEach((lead) => {
        const sid = lead.sheet_id || "unknown";
        sheetIdCounts[sid] = (sheetIdCounts[sid] || 0) + 1;
      });
      console.log("[SYNC DEBUG] Leads by sheet_id:", sheetIdCounts);
    }

    try {
      // Final validation: Ensure all leads have non-empty emails before proceeding
      const leadsWithEmptyEmails = validLeadsForSync.filter(
        (lead) => !lead.email || String(lead.email).trim() === "",
      );

      if (leadsWithEmptyEmails.length > 0) {
        console.error(
          `[SYNC] CRITICAL: ${leadsWithEmptyEmails.length} leads still have empty emails after processing!`,
        );
        console.error(
          "[SYNC] Sample leads with empty emails:",
          leadsWithEmptyEmails.slice(0, 3),
        );

        res.status(400).json({
          error: "Email generation failed",
          message: `${leadsWithEmptyEmails.length} leads have empty emails even after synthetic generation. This indicates a configuration issue.`,
          totalProcessed: validLeadsForSync.length,
          failedCount: leadsWithEmptyEmails.length,
        });
        return;
      }

      // Pre-check: Fetch existing leads for this sheet to preserve assignments
      console.log("Checking for existing leads to preserve assignments...");
      const { data: existingLeads } = await supabase
        .from("leads")
        .select("email, assigned_to, id, sheet_id")
        .eq("sheet_id", sheetId);

      const existingEmails = new Set(
        (existingLeads || [])
          .map((lead: any) => lead.email)
          .filter((email) => email), // Filter out null/empty emails
      );
      const existingAssignments = new Map(
        (existingLeads || [])
          .filter((lead: any) => lead.email) // Only map leads with emails
          .map((lead: any) => [lead.email, lead.assigned_to]),
      );

      console.log(
        `Found ${existingEmails.size} existing leads for sheet ${sheetId}`,
      );

      // Log sample of leads being synced with their emails
      console.log(
        "[SYNC] Sample leads about to sync (first 3):",
        validLeadsForSync.slice(0, 3).map((l) => ({
          name: l.name,
          email: l.email,
          phone: l.phone,
        })),
      );

      // Separate leads into new and existing (for this sheet only)
      // For leads without email, treat them as new
      const newLeads = validLeadsForSync.filter(
        (lead) => !lead.email || !existingEmails.has(lead.email),
      );
      const existingLeadsToUpdate = validLeadsForSync.filter(
        (lead) => lead.email && existingEmails.has(lead.email),
      );

      console.log(
        `${newLeads.length} new leads, ${existingLeadsToUpdate.length} leads to update`,
      );

      // Preserve existing assignments for leads that are being updated
      // Remove sheet_id from update data since it's immutable
      const leadsToUpdateWithPreservedAssignments = existingLeadsToUpdate.map(
        (lead) => {
          const { sheet_id, ...leadWithoutSheetId } = lead;
          const preservedAssignment = lead.email
            ? existingAssignments.get(lead.email)
            : undefined;
          return {
            ...leadWithoutSheetId,
            assigned_to:
              preservedAssignment || lead.assigned_to || "Unassigned",
          };
        },
      );

      let insertCount = 0;
      let updateCount = 0;
      let failureCount = 0;

      // First, try to insert new records
      if (newLeads.length > 0) {
        console.log(`Inserting ${newLeads.length} new leads into Supabase...`);
        console.log("[SYNC DEBUG] First lead to insert:", newLeads[0]);
        console.log(
          "[SYNC DEBUG] Sheet ID in first lead:",
          newLeads[0].sheet_id,
        );
        const { data, error } = await supabase
          .from("leads")
          .insert(newLeads)
          .select();

        if (!error) {
          insertCount = data?.length || newLeads.length;
          console.log(`✓ Inserted ${insertCount} new leads`);
          if (data && data.length > 0) {
            console.log("[SYNC DEBUG] First inserted record:", data[0]);
            console.log(
              "[SYNC DEBUG] Sheet ID in first inserted record:",
              data[0].sheet_id,
            );
          }

          // Verify the data was actually saved
          const { data: verifyData, error: verifyError } = await supabase
            .from("leads")
            .select("id, name, email, sheet_id")
            .eq("sheet_id", sheetId)
            .limit(1);

          if (!verifyError && verifyData && verifyData.length > 0) {
            console.log(
              `[SYNC DEBUG] Verification: Found lead in sheet ${sheetId}:`,
              verifyData[0],
            );
          } else if (verifyError) {
            console.warn(`[SYNC DEBUG] Verification failed:`, verifyError);
          } else {
            console.warn(
              `[SYNC DEBUG] Verification: No leads found in sheet ${sheetId}`,
            );
          }
        } else {
          console.warn(`Failed to insert ${newLeads.length} new leads:`, error);
          console.warn("[SYNC DEBUG] Error details:", JSON.stringify(error));
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
        `Sync complete: ${insertCount} new, ${updateCount} updated, ${failureCount} failed (${leadsToSync.length - validLeadsForSync.length} leads skipped due to missing required fields)`,
      );
      console.log(`[SYNC DEBUG] Final sheet_id being synced: ${sheetId}`);
      console.log(
        `[SYNC DEBUG] Total synced to sheet: ${updateCount + insertCount}`,
      );

      // Do a final verification query to confirm data was saved
      const { data: finalVerify, error: finalVerifyError } = await supabase
        .from("leads")
        .select("count")
        .eq("sheet_id", sheetId);

      console.log(
        `[SYNC DEBUG] Final verification - leads in sheet ${sheetId}:`,
        finalVerify?.[0]?.count || "unknown",
        finalVerifyError ? `(Error: ${finalVerifyError.message})` : "",
      );

      res.json({
        success: true,
        message: `Successfully synced ${updateCount + insertCount} leads${failureCount > 0 ? ` (${failureCount} failed)` : ""} (${leads.length - validLeadsForSync.length} empty rows or invalid leads removed)`,
        synced: updateCount + insertCount,
        newLeads: insertCount,
        updatedLeads: updateCount,
        failed: failureCount,
        skippedMissingFields: leadsToSync.length - validLeadsForSync.length,
        totalFetched: leads.length,
        emptyRowsRemoved: leads.length - leadsToSync.length,
        validRowsProcessed: validLeadsForSync.length,
        source: source,
        sheetId: sheetId,
        columnsIncluded:
          validLeadsForSync.length > 0 ? Object.keys(validLeadsForSync[0]) : [],
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
