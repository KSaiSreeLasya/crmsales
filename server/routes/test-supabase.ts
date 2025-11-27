import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

export const handleTestSupabase: RequestHandler = async (req, res) => {
  const result: any = {
    timestamp: new Date().toISOString(),
    supabaseUrlConfigured: !!supabaseUrl,
    supabaseKeyConfigured: !!supabaseKey,
  };

  if (!supabaseUrl) {
    result.error = "VITE_SUPABASE_URL is not configured";
    return res.status(500).json(result);
  }

  if (!supabaseKey) {
    result.error = "VITE_SUPABASE_ANON_KEY is not configured";
    return res.status(500).json(result);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to fetch tables
    const { data, error } = await supabase
      .from("leads")
      .select("id")
      .limit(1);

    if (error) {
      result.status = "error";
      result.message = "Connected to Supabase but query failed";
      result.error = {
        message: error.message,
        code: (error as any).code,
        hint: (error as any).hint,
      };
      return res.status(500).json(result);
    }

    result.status = "success";
    result.message = "✓ Successfully connected to Supabase";
    result.leadsTableExists = true;
    result.sampleQuerySuccessful = true;
    return res.json(result);
  } catch (err) {
    result.status = "error";
    result.message = "Failed to connect to Supabase";
    result.error = err instanceof Error ? err.message : String(err);
    return res.status(500).json(result);
  }
};
