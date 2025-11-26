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
          // Use session user data directly without extra API call
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            role:
              (session.user.user_metadata?.role as "admin" | "salesperson") ||
              "salesperson",
            name: session.user.user_metadata?.name || session.user.email || "",
            phone: session.user.user_metadata?.phone,
          });
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
        // Try to get pending user data from localStorage
        const storedUserData = localStorage.getItem("pendingAuthUser");
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData) as AuthUser;
            if (userData.id === session.user.id) {
              setUser(userData);
              localStorage.removeItem("pendingAuthUser");
            } else {
              // IDs don't match, use session data
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                role: "salesperson",
                name: session.user.email || "",
              });
            }
          } catch (e) {
            // Failed to parse, use session data
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              role: "salesperson",
              name: session.user.email || "",
            });
          }
        } else {
          // No pending data, use session data
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            role: "salesperson",
            name: session.user.email || "",
          });
        }
      } else {
        setUser(null);
        localStorage.removeItem("pendingAuthUser");
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
