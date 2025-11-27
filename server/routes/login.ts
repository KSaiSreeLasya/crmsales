import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const handleLogin: RequestHandler = async (req, res) => {
  // Ensure JSON response headers are set immediately
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  try {
    const { email, password } = req.body;

    console.log("Login attempt:", { email, hasPassword: !!password });

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ Supabase credentials not configured");
      return res.status(500).json({
        error: "Server configuration error",
        message:
          "Supabase credentials are not configured. Please contact your administrator.",
      });
    }

    console.log("Supabase configured ✅");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("❌ Auth error:", error);
      return res.status(401).json({
        error: "Authentication failed",
        message: error.message,
      });
    }

    if (!data.user) {
      console.error("❌ No user returned from auth");
      return res.status(401).json({ error: "No user returned from auth" });
    }

    console.log("✅ User authenticated:", data.user.email);

    // Fetch user profile to get role and other metadata
    const { data: profileData, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.warn("⚠️ Could not fetch user profile:", profileError.message);
    }

    const role = profileData?.role || "salesperson";
    const name = profileData?.name || data.user.email;
    const phone = profileData?.phone;

    const response = {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: name,
        role: role,
        phone: phone,
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_in: data.session?.expires_in,
        expires_at: data.session?.expires_at,
      },
    };

    console.log("✅ Login successful, sending response");
    return res.status(200).json(response);
  } catch (error) {
    console.error("❌ Login error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
    });
  }
};
