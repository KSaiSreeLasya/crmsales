import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { AuthUser } from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              role: profile.role,
              name: profile.name,
            });
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const response = await fetch(
            `/api/user-profile?userId=${encodeURIComponent(session.user.id)}`,
          );
          const profileData = await response.json();

          if (response.ok && profileData.profile) {
            setUser({
              id: profileData.profile.id,
              email: profileData.profile.email,
              role: profileData.profile.role,
              name: profileData.profile.name,
            });
          } else {
            // Fallback to session user if profile not found
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              role: "salesperson",
              name: session.user.user_metadata?.name || session.user.email || "",
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Fallback to session user
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            role: "salesperson",
            name: session.user.user_metadata?.name || session.user.email || "",
          });
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
