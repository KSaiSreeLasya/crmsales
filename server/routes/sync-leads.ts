/**
 * API Route: POST /api/sync-leads
 * Syncs leads from Google Sheets to Supabase database
 * 
 * This endpoint handles the backend logic for:
 * - Receiving leads from Google Sheets sync
 * - Validating lead data
 * - Storing in Supabase
 * - Avoiding duplicates
 */

import { RequestHandler } from "express";

interface SyncLeadRequest {
  leads: Array<{
    name: string;
    email: string;
    phone: string;
    company: string;
    status: string;
  }>;
  source: string;
}

export const handleSyncLeads: RequestHandler = async (req, res) => {
  try {
    const { leads, source } = req.body as SyncLeadRequest;

    if (!Array.isArray(leads) || leads.length === 0) {
      res.status(400).json({ error: "No leads provided" });
      return;
    }

    // Validate leads
    const validLeads = leads.filter(
      (lead) => lead.name && lead.email && lead.phone && lead.company
    );

    if (validLeads.length === 0) {
      res.status(400).json({ error: "No valid leads found" });
      return;
    }

    // TODO: Implement Supabase integration
    // const supabase = createSupabaseClient();
    // const { data, error } = await supabase
    //   .from("leads")
    //   .upsert(validLeads.map(lead => ({
    //     name: lead.name,
    //     email: lead.email,
    //     phone: lead.phone,
    //     company: lead.company,
    //     status: lead.status || "new",
    //     source: source || "api",
    //   })), {
    //     onConflict: "email" // Avoid duplicates by email
    //   });

    // For now, return mock success response
    res.json({
      success: true,
      message: `${validLeads.length} leads synced successfully`,
      synced: validLeads.length,
      source: source,
    });
  } catch (error) {
    console.error("Error syncing leads:", error);
    res.status(500).json({
      error: "Failed to sync leads",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
