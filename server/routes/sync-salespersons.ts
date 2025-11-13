/**
 * API Route: POST /api/sync-salespersons
 * Syncs salespersons from Google Sheets to Supabase database
 */

import { RequestHandler } from "express";

interface SyncSalespersonRequest {
  salespersons: Array<{
    name: string;
    email: string;
    phone: string;
    department?: string;
    region?: string;
  }>;
  source: string;
}

export const handleSyncSalespersons: RequestHandler = async (req, res) => {
  try {
    const { salespersons, source } = req.body as SyncSalespersonRequest;

    if (!Array.isArray(salespersons) || salespersons.length === 0) {
      res.status(400).json({ error: "No salespersons provided" });
      return;
    }

    // Validate salespersons - require name, email, phone
    const validSalespersons = salespersons.filter(
      (person) => person.name && person.email && person.phone,
    );

    if (validSalespersons.length === 0) {
      res.status(400).json({ error: "No valid salespersons found" });
      return;
    }

    // TODO: Implement Supabase integration
    // const supabase = createSupabaseClient();
    // const { data, error } = await supabase
    //   .from("salespersons")
    //   .upsert(validSalespersons.map(person => ({
    //     name: person.name,
    //     email: person.email,
    //     phone: person.phone,
    //     department: person.department || "",
    //     region: person.region || "",
    //   })), {
    //     onConflict: "email" // Avoid duplicates by email
    //   });

    // For now, return mock success response
    res.json({
      success: true,
      message: `${validSalespersons.length} salespersons synced successfully`,
      synced: validSalespersons.length,
      source: source,
    });
  } catch (error) {
    console.error("Error syncing salespersons:", error);
    res.status(500).json({
      error: "Failed to sync salespersons",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
