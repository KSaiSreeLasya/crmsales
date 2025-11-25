import { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Supabase credentials not configured for admin routes. User management may not work.",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Create a new user with password and profile
 * POST /api/admin/create-user
 */
export const handleCreateUser: RequestHandler = async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    if (!email || !password || !name || !phone || !role) {
      return res.status(400).json({
        message: "Missing required fields: email, password, name, phone, role",
      });
    }

    if (!["admin", "salesperson"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role. Must be 'admin' or 'salesperson'",
      });
    }

    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      console.error("Auth creation error:", authError);
      return res.status(400).json({
        message: authError.message || "Failed to create user",
      });
    }

    // Create user profile in database
    if (authData.user) {
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        email,
        name,
        phone,
        role,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Try to delete the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);

        return res.status(400).json({
          message: profileError.message || "Failed to create user profile",
        });
      }

      return res.json({
        message: "User created successfully",
        user: {
          id: authData.user.id,
          email,
          name,
          phone,
          role,
        },
      });
    }

    return res.status(400).json({
      message: "Failed to create user",
    });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Internal server error",
    });
  }
};

/**
 * Delete a user and their auth account
 * POST /api/admin/delete-user
 */
export const handleDeleteUser: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "Missing required field: userId",
      });
    }

    // Delete user profile from database
    const { error: profileError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("Profile deletion error:", profileError);
      return res.status(400).json({
        message: profileError.message || "Failed to delete user profile",
      });
    }

    // Delete auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("Auth deletion error:", authError);
      // Profile already deleted, but auth deletion failed
      return res.status(400).json({
        message:
          authError.message ||
          "User profile deleted but auth account deletion failed",
      });
    }

    return res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Internal server error",
    });
  }
};

/**
 * Update user password
 * POST /api/admin/update-password
 */
export const handleUpdatePassword: RequestHandler = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({
        message: "Missing required fields: userId, newPassword",
      });
    }

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error("Password update error:", error);
      return res.status(400).json({
        message: error.message || "Failed to update password",
      });
    }

    return res.json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Update password error:", error);
    return res.status(500).json({
      message:
        error instanceof Error ? error.message : "Internal server error",
    });
  }
};
