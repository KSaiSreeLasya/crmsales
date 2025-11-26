import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface UpdateItem {
  id: string;
  assigned_to: string;
}

export const handleBatchUpdateLeads: RequestHandler = async (req, res) => {
  try {
    const { updates } = req.body as { updates: UpdateItem[] };

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Invalid updates array" });
    }

    // Validate all updates have required fields
    const validUpdates = updates.every(
      (update) =>
        update.id && typeof update.id === "string" && update.assigned_to,
    );
    if (!validUpdates) {
      return res
        .status(400)
        .json({ error: "All updates must have id and assigned_to" });
    }

    // Perform batch update
    let successCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const update of updates) {
      try {
        const { error } = await supabase
          .from("leads")
          .update({ assigned_to: update.assigned_to })
          .eq("id", update.id);

        if (error) {
          errors.push({ id: update.id, error: error.message });
        } else {
          successCount++;
        }
      } catch (error) {
        errors.push({
          id: update.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    res.json({
      message: `Updated ${successCount} leads`,
      successCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Batch update error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
