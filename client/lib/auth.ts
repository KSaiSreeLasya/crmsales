import { supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "salesperson";
  name: string;
  phone?: string;
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
 * Create a new user with password (admin creating salesperson/other admin)
 */
export async function createUser(
  email: string,
  password: string,
  userData: { name: string; phone: string; role: "admin" | "salesperson" },
) {
  try {
    // Call the admin API endpoint to create user
    const response = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
      }),
    });

    // Parse response body only once
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error("Failed to parse server response");
    }

    if (!response.ok) {
      throw new Error(data.message || "Failed to create user");
    }

    return data;
  } catch (error) {
    console.error("Create user error:", error);
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

    // Store user data in localStorage for auth context to use
    if (data.user) {
      localStorage.setItem("pendingAuthUser", JSON.stringify(data.user));
    }

    // Set the session in Supabase to trigger auth context
    if (data.session && data.session.access_token) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token || "",
      });
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
 * Get current user session via backend API
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Use backend API to fetch profile (avoids RLS issues)
    const response = await fetch(
      `/api/user-profile?userId=${encodeURIComponent(user.id)}`,
    );
    const profileData = await response.json();

    if (response.ok && profileData.profile) {
      return {
        id: profileData.profile.id,
        email: profileData.profile.email,
        role: profileData.profile.role,
        name: profileData.profile.name,
        phone: profileData.profile.phone,
      };
    }

    // Fallback to session user if profile not found
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
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<AuthUser[]> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

/**
 * Update user (admin only)
 */
export async function updateUser(userId: string, updates: Partial<AuthUser>) {
  try {
    const { data, error } = await supabase
      .from("users")
      .update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        role: updates.role,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(userId: string) {
  try {
    // Call the admin API endpoint to delete user
    const response = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error("Failed to parse server response");
    }

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete user");
    }

    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
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
