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

    // Validate leads - only require name, email, phone (company is optional)
    const validLeads = leads.filter((lead) => {
      const isValid = lead.name && lead.email && lead.phone;
      if (!isValid) {
        console.log("Invalid lead filtered out:", lead);
      }
      return isValid;
    });

    console.log("Valid leads after filtering:", validLeads.length);

    if (validLeads.length === 0) {
      res.status(400).json({
        error: "No valid leads found - requires: name, email, phone",
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

    // Map leads to Supabase schema and upsert by email
    const leadsToSync = validLeads.map((lead) => ({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      street_address: lead.street_address || "",
      post_code: lead.post_code || "",
      lead_status: lead.lead_status || "",
      electricity_bill: lead.electricity_bill || "",
      status: lead.status || "Not lifted",
      assigned_to: lead.assignedTo || "Unassigned",
      note1: lead.note1 || "",
      note2: lead.note2 || "",
      source: source || "api",
    }));

    console.log("Attempting to upsert leads to Supabase...");
    console.log("Sample lead to insert:", leadsToSync[0]);

    const { data, error } = await supabase
      .from("leads")
      .upsert(leadsToSync, {
        onConflict: "email",
      })
      .select();

    if (error) {
      console.error("Supabase error:", error);
      console.error("Error details:", {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      });
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
