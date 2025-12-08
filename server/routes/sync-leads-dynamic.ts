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

    // Validate email format
    const validateEmail = (email: string): boolean => {
      if (!email || typeof email !== "string") return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.trim());
    };

    // For dynamic sync, validate that rows have meaningful data
    // Use smart validation: strict first, then fallback to lenient
    const validationResults = leads.map((lead, index) => {
      let nameValue = "";
      let emailValue = "";
      let phoneValue = "";
      let validationErrors: string[] = [];

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
          (normalizedKey.includes("email") || normalizedKey.includes("mail")) &&
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

      // Validation: require name and email (email required for upsert constraint, phone is optional)
      const hasName = nameValue && nameValue.length > 0;
      const hasEmail = emailValue && emailValue.length > 0;
      const hasValidEmail = emailValue && validateEmail(emailValue);

      if (!hasName) {
        validationErrors.push(
          `Missing name (checked columns with "name" or "full" keywords)`,
        );
      }
      if (!hasEmail) {
        validationErrors.push(`Missing email (checked columns with "email")`);
      }
      if (hasEmail && !hasValidEmail) {
        validationErrors.push(
          `Invalid email format: "${emailValue}" (must contain @ and domain)`,
        );
      }

      // Check if row has any data at all (for fallback validation)
      const hasAnyData = Object.values(lead).some((value) => {
        const strValue = String(value || "").trim();
        return strValue.length > 0;
      });

      const isValid = hasName && hasValidEmail;

      return {
        lead,
        isValid,
        nameValue,
        emailValue,
        phoneValue,
        validationErrors,
        rowIndex: index,
        hasAnyData,
      };
    });

    let validLeads = validationResults
      .filter((item) => item.isValid)
      .map((item) => item.lead);

    // Log validation issues for debugging
    const invalidLeads = validationResults.filter((item) => !item.isValid);
    if (invalidLeads.length > 0) {
      console.warn(
        `[SYNC] ${invalidLeads.length} rows failed strict validation:`,
      );
      invalidLeads.slice(0, 5).forEach((invalid) => {
        console.warn(
          `[SYNC] Row ${invalid.rowIndex}: name="${invalid.nameValue}" email="${invalid.emailValue}" errors=[${invalid.validationErrors.join(", ")}]`,
        );
      });
    }

    console.log("Valid leads after strict filtering:", validLeads.length);

    // Fallback: if strict validation rejected all rows but they have data, use lenient validation
    if (validLeads.length === 0 && leads.length > 0) {
      const rowsWithData = validationResults.filter((item) => item.hasAnyData);

      if (rowsWithData.length > 0) {
        console.warn(
          `[SYNC] Strict validation rejected all rows. Switching to lenient validation for ${rowsWithData.length} rows with data...`,
        );
        validLeads = rowsWithData.map((item) => item.lead);
      }
    }

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

      // Analyze why validation failed
      const failureReasons = new Map<string, number>();
      invalidLeads.forEach((invalid) => {
        invalid.validationErrors.forEach((error) => {
          failureReasons.set(error, (failureReasons.get(error) || 0) + 1);
        });
      });

      console.error("No valid leads after filtering:", {
        totalRows: leads.length,
        validRows: validLeads.length,
        invalidRows: invalidLeads.length,
        failureReasons: Object.fromEntries(failureReasons),
        sampleInvalidRows: invalidLeads.slice(0, 3),
        requiredFields: "name and email (phone is optional)",
      });

      const failureDetails = Array.from(failureReasons.entries())
        .map(([reason, count]) => `${reason} (${count} rows)`)
        .join("; ");

      res.status(400).json({
        error: "No valid leads found - column alignment issue detected",
        totalRowsFetched: leads.length,
        validRows: validLeads.length,
        invalidRows: invalidLeads.length,
        failureReasons: Object.fromEntries(failureReasons),
        sampleFailedRow: invalidLeads.length > 0 ? invalidLeads[0] : null,
        sampleData: sampleRows.length > 0 ? sampleRows[0] : null,
        columns: Object.keys(leads[0] || {}),
        hint: `${failureDetails}. The sheet columns may be misaligned. Use /api/diagnose-sheet-columns?spreadsheetId=...&sheetId=... to diagnose the issue.`,
        troubleshooting: `Expected columns: "Name" (or "Full Name"), "Email", "Phone" (optional). Ensure your Google Sheet has these exact column headers.`,
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

    // Prepare leads data - normalize column names to match Supabase schema
    console.log(`[SYNC] Starting to map ${validLeads.length} leads...`);
    const leadsToSync = validLeads.map((lead, rowIndex) => {
      if (rowIndex === 0) {
        console.log(`[SYNC] Processing first lead, keys:`, Object.keys(lead));
        console.log(
          `[SYNC] First lead raw email value: "${lead.email}" (type: ${typeof lead.email})`,
        );
      }
      const syncData: any = {
        source: source || "google_sheet",
        sheet_id: sheetId || "0",
      };

      // Helper function to find and map column values
      const mapColumn = (patterns: string[]): string => {
        for (const [key, value] of Object.entries(lead)) {
          // Skip null/undefined values, but NOT empty strings
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

      let finalEmail = "";

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

        const phone = String(phoneRaw).trim();
        const sanitizedName = String(name)
          .toLowerCase()
          .trim()
          .replace(/\s+/g, ".")
          .replace(/[^a-z0-9.]/g, "");

        const sanitizedPhone = String(phone).replace(/\D/g, "").slice(-4);
        const timestamp = Date.now().toString().slice(-6);
        const uniqueSuffix = `${timestamp}${rowIndex.toString().padStart(4, "0")}`;

        const baseEmail = (sanitizedName || "unknown").substring(0, 40);
        const emailDomain = `${baseEmail}${sanitizedPhone ? "." + sanitizedPhone : ""}`;

        finalEmail = `${emailDomain}.${uniqueSuffix}@synced-lead.local`
          .substring(0, 254)
          .toLowerCase();

        console.log(
          `[SYNC] Row ${rowIndex}: Generated synthetic email for lead "${name}" (phone: ${phone}): ${finalEmail}`,
        );
      } else {
        finalEmail = emailTrimmed;
        console.log(
          `[SYNC] Row ${rowIndex}: Using email from sheet for lead "${syncData.name}": ${finalEmail}`,
        );
      }

      syncData.email = finalEmail;

      if (rowIndex < 5) {
        console.log(`[SYNC] Row ${rowIndex} final email assignment:`, {
          originalCSVEmail: lead.email,
          afterMapColumn: emailValue,
          finalSyncDataEmail: syncData.email,
          isEmpty: !syncData.email || String(syncData.email).trim() === "",
        });
      }

      const phoneValue = mapColumn([
        "phone",
        "phone_no",
        "phone_number",
        "telephone",
        "contact phone",
      ]);

      syncData.phone = (phoneValue && String(phoneValue).trim()) || "";
      syncData.company =
        mapColumn(["company", "organization", "business", "company name"]) ||
        "N/A";
      syncData.street_address =
        mapColumn(["street address", "street_address", "street", "address"]) ||
        "N/A";
      syncData.post_code =
        mapColumn(["post_code", "postal_code", "postcode", "zip_code"]) ||
        "N/A";
      syncData.lead_status = mapColumn(["lead_status", "status"]) || "N/A";
      syncData.electricity_bill =
        mapColumn([
          "electricity_bill",
          "what_is_your_average_monthly_electricity_bill",
          "average_monthly_electricity_bill",
          "monthly_electricity_bill",
          "avg_bill",
          "monthly_bill",
        ]) || "N/A";
      syncData.type_of_property =
        mapColumn([
          "what_type_of_property_do_you_want_to_install_solar_on",
          "type_of_property",
          "property_type",
          "property",
        ]) || "N/A";
      syncData.avg_monthly_bill = syncData.electricity_bill;
      syncData.status = "Not lifted";

      const now = new Date().toISOString();
      if (!syncData.created_at) {
        syncData.created_at = now;
      } else {
        console.log(
          "[SYNC DEBUG] Lead already has created_at:",
          syncData.created_at,
        );
      }

      syncData.updated_at = syncData.updated_at || now;

      if (!sheetId || sheetId === "undefined") {
        console.warn("[SYNC DEBUG] WARNING: sheetId is missing or undefined!");
      }
      syncData.sheet_id = String(sheetId || "0");

      return syncData;
    });

    console.log(`[SYNC] Processing ${leadsToSync.length} leads for sync...`);
    const validLeadsForSync = leadsToSync.map((lead, idx) => {
      const processedLead = { ...lead };

      let name = String(processedLead.name || "").trim();
      if (!name) {
        console.warn(`[SYNC] Row ${idx}: No name found - WILL BE REJECTED`);
      } else {
        processedLead.name = name;
      }

      let email = String(processedLead.email || "").trim();
      if (!email) {
        const timestamp = Date.now().toString().slice(-6);
        const fallbackEmail = `synced.lead.${timestamp}.${idx}@synced-lead.local`;
        email = fallbackEmail;
        processedLead.email = fallbackEmail;
        if (idx < 3) {
          console.log(
            `[SYNC] Row ${idx}: No email, generated synthetic: ${fallbackEmail}`,
          );
        }
      } else {
        processedLead.email = email;
      }

      let phone = String(processedLead.phone || "").trim();
      if (!phone) {
        console.warn(`[SYNC] Row ${idx}: No phone - WILL BE REJECTED`);
      } else {
        processedLead.phone = phone;
      }

      let company = String(processedLead.company || "").trim();
      if (!company) {
        company = "N/A";
        processedLead.company = "N/A";
      } else {
        processedLead.company = company;
      }

      if (idx < 3) {
        console.log(`[SYNC] Row ${idx} after processing:`, {
          name: processedLead.name,
          email: processedLead.email,
          phone: processedLead.phone,
          company: processedLead.company,
        });
      }

      return processedLead;
    });

    console.log(
      `[SYNC] All ${validLeadsForSync.length} leads processed with defaults applied`,
    );

    if (validLeadsForSync.length === 0) {
      console.warn(
        `[SYNC] WARNING: 0 leads after processing defaults. This is unexpected.`,
      );
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

      const allHaveCorrectSheetId = validLeadsForSync.every(
        (lead) => lead.sheet_id === String(sheetId || "0"),
      );
      console.log(
        `[SYNC DEBUG] All leads have correct sheet_id (${String(sheetId || "0")}):`,
        allHaveCorrectSheetId,
      );

      const sheetIdCounts: { [key: string]: number } = {};
      validLeadsForSync.forEach((lead) => {
        const sid = lead.sheet_id || "unknown";
        sheetIdCounts[sid] = (sheetIdCounts[sid] || 0) + 1;
      });
      console.log("[SYNC DEBUG] Leads by sheet_id:", sheetIdCounts);
    }

    try {
      console.log(
        "[SYNC] Starting validation on",
        validLeadsForSync.length,
        "leads",
      );
      if (validLeadsForSync.length > 0) {
        console.log("[SYNC] Sample lead before validation:", {
          name: validLeadsForSync[0].name,
          email: validLeadsForSync[0].email,
          phone: validLeadsForSync[0].phone,
          company: validLeadsForSync[0].company,
          allKeys: Object.keys(validLeadsForSync[0]),
        });
      }

      const validatedLeads = validLeadsForSync.filter((lead, idx) => {
        const name = String(lead.name || "").trim();
        const phone = String(lead.phone || "").trim();

        const isValid = name.length > 0 && phone.length > 0;

        if (!isValid && idx < 3) {
          console.error(
            `[SYNC] Row ${idx} REJECTED due to missing REQUIRED fields (name or phone):`,
            {
              name: name || "MISSING",
              phone: phone || "MISSING",
              rawLead: {
                name: lead.name,
                phone: lead.phone,
              },
            },
          );
        }

        return isValid;
      });

      const rejectedCount = validLeadsForSync.length - validatedLeads.length;
      if (rejectedCount > 0) {
        console.error(
          `[SYNC] CRITICAL: ${rejectedCount} leads rejected due to missing required fields. This indicates a bug in default application.`,
        );
      }

      console.log(
        `[SYNC] Proceeding with ${validatedLeads.length} validated leads (rejected ${rejectedCount})`,
      );
      console.log(
        "[SYNC DEBUG] Sample lead keys:",
        Object.keys(leadsToSync[0] || {}),
      );

      if (validatedLeads.length === 0) {
        console.warn("[SYNC] No validated leads to sync after filtering.");
        res.json({
          success: true,
          message: "No leads to sync (all leads were missing required fields)",
          synced: 0,
          newLeads: 0,
          updatedLeads: 0,
          failed: 0,
          rejected: rejectedCount,
          skippedMissingFields: leadsToSync.length - validLeadsForSync.length,
          totalFetched: leads.length,
          emptyRowsRemoved: leads.length - leadsToSync.length,
          validRowsProcessed: validLeadsForSync.length,
          validatedRowsAfterFiltering: validatedLeads.length,
          source: source,
          sheetId: sheetId,
          columnsIncluded: [],
        });
        return;
      }

      // Pre-check: Fetch existing leads for this sheet to preserve assignments
      console.log("Checking for existing leads to preserve assignments...");
      const { data: existingLeads, error: existingError } = await supabase
        .from("leads")
        .select("email, assigned_to, id, sheet_id")
        .eq("sheet_id", String(sheetId));

      if (existingError) {
        console.warn("Error fetching existing leads:", existingError);
      }

      // Create a map with normalized emails (lowercase, trimmed) for accurate matching
      const existingEmailMap = new Map<string, any>();
      (existingLeads || []).forEach((lead: any) => {
        const normalizedEmail = String(lead.email || "")
          .toLowerCase()
          .trim();
        if (normalizedEmail) {
          existingEmailMap.set(normalizedEmail, lead);
        }
      });

      console.log(
        `Found ${existingEmailMap.size} existing leads for sheet ${sheetId}`,
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
      // Use normalized email comparison
      const newLeads = validatedLeads.filter((lead) => {
        const normalizedEmail = String(lead.email || "")
          .toLowerCase()
          .trim();
        return !existingEmailMap.has(normalizedEmail);
      });

      const existingLeadsToUpdate = validatedLeads.filter((lead) => {
        const normalizedEmail = String(lead.email || "")
          .toLowerCase()
          .trim();
        return existingEmailMap.has(normalizedEmail);
      });

      // Create assignment map using normalized emails
      const existingAssignments = new Map<string, string>();
      existingEmailMap.forEach((lead) => {
        const normalizedEmail = String(lead.email || "")
          .toLowerCase()
          .trim();
        if (normalizedEmail && lead.assigned_to) {
          existingAssignments.set(normalizedEmail, lead.assigned_to);
        }
      });

      console.log(
        `${newLeads.length} new leads, ${existingLeadsToUpdate.length} leads to update`,
      );

      // Preserve existing assignments for leads that are being updated
      const leadsToUpdateWithPreservedAssignments = existingLeadsToUpdate.map(
        (lead) => {
          const { sheet_id, ...leadWithoutSheetId } = lead;
          const normalizedEmail = String(lead.email || "")
            .toLowerCase()
            .trim();
          return {
            ...leadWithoutSheetId,
            assigned_to:
              existingAssignments.get(normalizedEmail) || "Unassigned",
          };
        },
      );

      // Initialize counters
      let insertCount = 0;
      let updateCount = 0;
      let failureCount = 0;

      // First, try to insert new records
      if (newLeads.length > 0) {
        console.log(`Inserting ${newLeads.length} new leads into Supabase...`);
        console.log(
          "[SYNC DEBUG] First lead to insert:",
          JSON.stringify(newLeads[0], null, 2),
        );
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
          console.error("Insert error details:", {
            message: error.message,
            code: (error as any).code,
            details: (error as any).details,
          });

          const errorCode = (error as any).code;
          const errorMessage = (error as any).message || String(error);

          // If it's a duplicate key error, try updating instead
          if (
            errorMessage?.includes("duplicate") ||
            errorCode === "23505"
          ) {
            console.log(
              "Duplicate key detected during insert, attempting to update these leads instead...",
            );
            for (const lead of newLeads) {
              const normalizedEmail = String(lead.email || "")
                .toLowerCase()
                .trim();
              const updateData = {
                ...lead,
                updated_at: new Date().toISOString(),
                assigned_to:
                  existingAssignments.get(normalizedEmail) || "Unassigned",
              };

              const { error: updateError } = await supabase
                .from("leads")
                .update(updateData)
                .eq("email", normalizedEmail)
                .eq("sheet_id", String(sheetId));

              if (!updateError) {
                updateCount++;
                console.log(
                  `✓ Updated lead with email ${normalizedEmail} in sheet ${sheetId}`,
                );
              } else {
                failureCount++;
                console.warn(
                  `Failed to update lead with email ${lead.email} in sheet ${sheetId}:`,
                  updateError,
                );
              }
            }

            // If we successfully updated all duplicate leads, continue to normal flow
            if (updateCount === newLeads.length) {
              console.log(
                `✓ Successfully recovered from duplicate key error by updating all ${updateCount} leads`,
              );
            } else if (updateCount > 0) {
              console.warn(
                `Partial recovery: updated ${updateCount}/${newLeads.length} leads, ${failureCount} failed`,
              );
            } else {
              console.error(
                `Failed to recover from duplicate key error - no leads were updated`,
              );
              let troubleshootingMsg = "";
              let specificAdvice = "";

              troubleshootingMsg =
                "Duplicate key error. Leads with these emails already exist in this sheet. The system attempted to update them but failed.";
              specificAdvice =
                "Ensure the sheet ID is correct and that the leads are not being protected by RLS policies.";

              res.status(400).json({
                error: "Failed to sync leads - duplicate key error",
                message: errorMessage,
                details: (error as any).details,
                code: errorCode,
                hint: (error as any).hint,
                troubleshooting: troubleshootingMsg,
                specificAdvice,
                fullError: {
                  message: errorMessage,
                  code: errorCode,
                  details: (error as any).details,
                  status: (error as any).status,
                },
                diagnosticEndpoint:
                  "POST /api/diagnose-sync-issue with {spreadsheetId, sheetId} to get detailed diagnostics",
              });
              return;
            }
          } else {
            failureCount += newLeads.length;
            console.error(
              `[SYNC] CRITICAL: Failed to insert ${newLeads.length} new leads:`,
              error,
            );
            console.error("[SYNC] Error code:", errorCode);
            console.error("[SYNC] Error message:", errorMessage);
            console.error("[SYNC] Error details:", JSON.stringify(error));
            if (newLeads.length > 0) {
              console.error(
                "[SYNC] First lead being inserted:",
                JSON.stringify(newLeads[0]),
              );
              console.error(
                "[SYNC] Lead keys:",
                Object.keys(newLeads[0]).join(", "),
              );
              console.error(
                "[SYNC] Lead email value:",
                newLeads[0].email,
                `(length: ${String(newLeads[0].email).length})`,
              );
              console.error(
                "[SYNC] Lead name value:",
                newLeads[0].name,
                `(length: ${String(newLeads[0].name).length})`,
              );
              console.error(
                "[SYNC] Lead phone value:",
                newLeads[0].phone,
                `(length: ${String(newLeads[0].phone).length})`,
              );
            }

            let troubleshootingMsg = "";
            let specificAdvice = "";

            if (errorCode === "42703") {
              troubleshootingMsg =
                "Column does not exist in the database. Run the migration SQL from SUPABASE_MIGRATION_ADD_COLUMNS.sql to add missing columns.";
              const missingColumn = errorMessage.match(
                /column "([^"]+)" does not exist/i,
              );
              if (missingColumn) {
                specificAdvice = `Missing column: "${missingColumn[1]}". Add this column to your Supabase leads table.`;
              }
            } else if (errorCode === "42P01") {
              troubleshootingMsg =
                "Table 'leads' does not exist. Run SUPABASE_TABLES.sql to create the table.";
            } else if (errorCode === "23502") {
              troubleshootingMsg =
                "NOT NULL constraint violation. A required field is missing or empty.";
              const missingField = errorMessage.match(
                /violates not-null constraint on column "([^"]+)"/i,
              );
              if (missingField) {
                specificAdvice = `The "${missingField[1]}" field is required but missing or empty in the data.`;
              }
            } else if (errorMessage?.includes("RLS")) {
              troubleshootingMsg =
                "RLS policy is blocking INSERT. Ensure RLS is disabled or policies are configured correctly.";
              specificAdvice =
                "Go to Supabase > Authentication > Policies and disable RLS for the leads table temporarily.";
            } else {
              troubleshootingMsg =
                "Ensure Supabase credentials are configured and the table schema is correct.";
              specificAdvice =
                "Run the diagnostic endpoint: POST /api/diagnose-sync-issue to identify the exact issue.";
            }

            res.status(400).json({
              error: "Failed to insert leads",
              message: errorMessage,
              details: (error as any).details,
              code: errorCode,
              hint: (error as any).hint,
              troubleshooting: troubleshootingMsg,
              specificAdvice,
              fullError: {
                message: errorMessage,
                code: errorCode,
                details: (error as any).details,
                status: (error as any).status,
              },
              diagnosticEndpoint:
                "POST /api/diagnose-sync-issue with {spreadsheetId, sheetId} to get detailed diagnostics",
            });
            return;
          }
        }
      } else {
        console.log(
          "[SYNC DEBUG] No new leads to insert (all existing or filtered out)",
        );
      }

      // Update each existing lead (preserving assignments)
      if (existingLeadsToUpdate.length > 0) {
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
      }

      console.log(
        `Sync complete: ${insertCount} new, ${updateCount} updated, ${failureCount} failed`,
      );
      console.log(`[SYNC DEBUG] Final sheet_id being synced: ${sheetId}`);
      console.log(
        `[SYNC DEBUG] Total synced to sheet: ${updateCount + insertCount}`,
      );

      const { data: finalVerify } = await supabase
        .from("leads")
        .select("count")
        .eq("sheet_id", sheetId);

      console.log(
        `[SYNC DEBUG] Final verification - leads in sheet ${sheetId}:`,
        finalVerify?.[0]?.count || "unknown",
      );

      const rowsSkipped = leads.length - validLeads.length;
      const emptyRowsRemoved = validLeads.length - leadsToSync.length;

      res.json({
        success: true,
        message: `Successfully synced ${updateCount + insertCount} leads${failureCount > 0 ? ` (${failureCount} failed)` : ""}`,
        synced: updateCount + insertCount,
        newLeads: insertCount,
        updatedLeads: updateCount,
        failed: failureCount,
        rejected: rejectedCount,
        skippedMissingFields: leadsToSync.length - validLeadsForSync.length,
        totalFetched: leads.length,
        rowsSkipped: rowsSkipped,
        emptyRowsRemoved: emptyRowsRemoved,
        validRowsProcessed: validLeadsForSync.length,
        validatedRowsAfterFiltering: validatedLeads.length,
        source: source,
        sheetId: sheetId,
        columnsIncluded:
          validatedLeads.length > 0 ? Object.keys(validatedLeads[0]) : [],
      });
    } catch (err) {
      console.error("Error during sync operation:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Full error details:", {
        message: errorMessage,
        code: (err as any)?.code,
        details: (err as any)?.details,
        error: err,
      });

      res.status(500).json({
        error: "Failed to sync leads",
        message: errorMessage,
        code: (err as any)?.code,
        details: (err as any)?.details,
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
