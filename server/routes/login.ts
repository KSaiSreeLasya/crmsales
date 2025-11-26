import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Auth error:", error);
      return res.status(401).json({
        error: "Authentication failed",
        message: error.message,
      });
    }

    if (!data.user) {
      return res.status(401).json({ error: "No user returned from auth" });
    }

    // Fetch user profile to get role and other metadata
    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    const role = profileData?.role || "salesperson";
    const name = profileData?.name || data.user.email;
    const phone = profileData?.phone;

    res.json({
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
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
