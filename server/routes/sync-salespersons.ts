/**
 * API Route: POST /api/sync-salespersons
 * Syncs salespersons from Google Sheets to Supabase database
 */

import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

interface SyncSalespersonRequest {
  salespersons: Array<{
    name: string;
    email: string;
    phone: string;
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

    if (!supabaseUrl || !supabaseKey) {
      // If Supabase is not configured, return success but don't persist
      console.warn("Supabase not configured, returning mock response");
      res.json({
        success: true,
        message: `${validSalespersons.length} salespersons processed (Supabase not configured)`,
        synced: validSalespersons.length,
        source: source,
        warning: "Supabase credentials not configured",
      });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map salespersons to Supabase schema and upsert by email
    const personsToSync = validSalespersons.map((person) => ({
      name: person.name,
      email: person.email,
      phone: person.phone,
      department: person.department || "",
      region: person.region || "",
    }));

    const { data, error } = await supabase
      .from("salespersons")
      .upsert(personsToSync, {
        onConflict: "email",
      })
      .select();

    if (error) {
      console.error("Supabase error:", error);
      res.status(500).json({
        error: "Failed to sync salespersons to database",
        message: error.message,
      });
      return;
    }

    res.json({
      success: true,
      message: `${validSalespersons.length} salespersons synced successfully`,
      synced: validSalespersons.length,
      source: source,
      data: data,
    });
  } catch (error) {
    console.error("Error syncing salespersons:", error);
    res.status(500).json({
      error: "Failed to sync salespersons",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
