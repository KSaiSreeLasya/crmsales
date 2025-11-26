import { supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "salesperson";
  name: string;
}

/**
 * Sign up a new user (admin only)
 */
export async function signUp(
  email: string,
  password: string,
  userData: { name: string; phone: string; role: "admin" | "salesperson" },
) {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
        },
      },
    });

    if (authError) throw authError;

    // Create user profile in database
    if (authData.user) {
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        email,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
      });

      if (profileError) throw profileError;
    }

    return authData.user;
  } catch (error) {
    console.error("Sign up error:", error);
    throw error;
  }
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string) {
  try {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || "Login failed");
    }

    return { user: data.user, profile: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown login error";
    console.error("Login error:", errorMessage);
    throw error;
  }
}

/**
 * Logout
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

/**
 * Get current user session
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email || "",
      role: "salesperson",
      name: user.user_metadata?.name || user.email || "",
    };
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

/**
 * Get assigned leads for a salesperson
 */
export async function getAssignedLeads(salespersonName: string) {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("assigned_to", salespersonName)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching assigned leads:", error);
    return [];
  }
}
