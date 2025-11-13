/**
 * API Route: POST /api/sync-leads
 * Syncs leads from Google Sheets to Supabase database
 */

import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

interface SyncLeadRequest {
  leads: Array<{
    name: string;
    email: string;
    phone: string;
    company: string;
    street_address?: string;
    post_code?: string;
    lead_status?: string;
    electricity_bill?: string;
    status?: string;
    assignedTo?: string;
    note1?: string;
    note2?: string;
  }>;
  source: string;
}

export const handleSyncLeads: RequestHandler = async (req, res) => {
  try {
    const { leads, source } = req.body as SyncLeadRequest;

    console.log("Sync request received with leads:", leads.length);
    if (leads.length > 0) {
      console.log("First lead sample:", leads[0]);
    }

    if (!Array.isArray(leads) || leads.length === 0) {
      res.status(400).json({ error: "No leads provided" });
      return;
    }

    // Validate leads - only require name and email
    const validLeads = leads.filter((lead) => {
      const isValid = lead.name && lead.email;
      if (!isValid) {
        console.log("Invalid lead filtered out - missing name or email:", lead);
      }
      return isValid;
    });

    console.log("Valid leads after filtering:", validLeads.length);
    if (validLeads.length > 0) {
      console.log("First valid lead:", validLeads[0]);
    }

    if (validLeads.length === 0) {
      res.status(400).json({
        error: "No valid leads found - requires at minimum: name, email",
        sample: leads[0],
      });
      return;
    }

    if (!supabaseUrl || !supabaseKey) {
      // If Supabase is not configured, return success but don't persist
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

    // Map leads to Supabase schema - only required fields
    const leadsToSync = validLeads.map((lead) => {
      const syncData: any = {
        name: lead.name,
        email: lead.email,
        phone: lead.phone || "",
        company: lead.company || "",
        status: lead.status || "Not lifted",
        assigned_to: lead.assignedTo || "Unassigned",
        source: source || "google_sheet",
      };

      // Add optional fields only if they have values
      if (lead.street_address) syncData.street_address = lead.street_address;
      if (lead.post_code) syncData.post_code = lead.post_code;
      if (lead.lead_status) syncData.lead_status = lead.lead_status;
      if (lead.electricity_bill) syncData.electricity_bill = lead.electricity_bill;
      if (lead.note1) syncData.note1 = lead.note1;
      if (lead.note2) syncData.note2 = lead.note2;

      return syncData;
    });

    console.log("Attempting to insert leads to Supabase...");
    console.log("Total leads to sync:", leadsToSync.length);
    console.log("Sample lead:", leadsToSync[0]);

    const { data, error } = await supabase
      .from("leads")
      .insert(leadsToSync)
      .select();

    if (error) {
      console.error("Supabase error:", error);
      console.error("Error details:", {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      });

      // If duplicate key error, try updating instead
      if (error.message.includes("duplicate") || error.code === "23505") {
        console.log("Duplicate detected, attempting update instead...");
        try {
          const updateResults = await Promise.all(
            leadsToSync.map((lead) =>
              supabase
                .from("leads")
                .update(lead)
                .eq("email", lead.email)
                .select()
            )
          );

          const updatedCount = updateResults.filter((r) => !r.error).length;
          res.json({
            success: true,
            message: `${updatedCount} leads updated and ${leadsToSync.length - updatedCount} new leads added`,
            synced: leadsToSync.length,
            source: source,
          });
          return;
        } catch (updateError) {
          console.error("Update failed:", updateError);
        }
      }

      res.status(500).json({
        error: "Failed to sync leads to database",
        message: error.message,
        details: (error as any).details,
        code: (error as any).code,
      });
      return;
    }

    console.log("Successfully synced", data?.length, "leads");

    res.json({
      success: true,
      message: `${validLeads.length} leads synced successfully`,
      synced: validLeads.length,
      source: source,
      data: data,
    });
  } catch (error) {
    console.error("Error syncing leads:", error);
    res.status(500).json({
      error: "Failed to sync leads",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
