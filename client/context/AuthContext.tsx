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
          // Fetch user profile from database to get the correct role
          try {
            const response = await fetch(
              `/api/user-profile?userId=${encodeURIComponent(session.user.id)}`
            );
            const profileData = await response.json();

            if (response.ok && profileData.profile) {
              setUser({
                id: profileData.profile.id,
                email: profileData.profile.email || "",
                role: profileData.profile.role || "salesperson",
                name: profileData.profile.name || "",
                phone: profileData.profile.phone,
              });
            } else {
              // Fallback if profile fetch fails
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                role: "salesperson",
                name: session.user.email || "",
              });
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
            // Fallback if fetch fails
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              role: "salesperson",
              name: session.user.email || "",
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
        // Try to get pending user data from localStorage (set during login)
        const storedUserData = localStorage.getItem("pendingAuthUser");
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData) as AuthUser;
            if (userData.id === session.user.id) {
              setUser(userData);
              localStorage.removeItem("pendingAuthUser");
            } else {
              // IDs don't match, fetch from database
              try {
                const response = await fetch(
                  `/api/user-profile?userId=${encodeURIComponent(session.user.id)}`
                );
                const profileData = await response.json();

                if (response.ok && profileData.profile) {
                  setUser({
                    id: profileData.profile.id,
                    email: profileData.profile.email || "",
                    role: profileData.profile.role || "salesperson",
                    name: profileData.profile.name || "",
                    phone: profileData.profile.phone,
                  });
                } else {
                  setUser({
                    id: session.user.id,
                    email: session.user.email || "",
                    role: "salesperson",
                    name: session.user.email || "",
                  });
                }
              } catch (error) {
                console.error("Error fetching user profile:", error);
                setUser({
                  id: session.user.id,
                  email: session.user.email || "",
                  role: "salesperson",
                  name: session.user.email || "",
                });
              }
            }
          } catch (e) {
            // Failed to parse localStorage, fetch from database
            try {
              const response = await fetch(
                `/api/user-profile?userId=${encodeURIComponent(session.user.id)}`
              );
              const profileData = await response.json();

              if (response.ok && profileData.profile) {
                setUser({
                  id: profileData.profile.id,
                  email: profileData.profile.email || "",
                  role: profileData.profile.role || "salesperson",
                  name: profileData.profile.name || "",
                  phone: profileData.profile.phone,
                });
              } else {
                setUser({
                  id: session.user.id,
                  email: session.user.email || "",
                  role: "salesperson",
                  name: session.user.email || "",
                });
              }
            } catch (error) {
              console.error("Error fetching user profile:", error);
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                role: "salesperson",
                name: session.user.email || "",
              });
            }
          }
        } else {
          // No pending data, fetch from database
          try {
            const response = await fetch(
              `/api/user-profile?userId=${encodeURIComponent(session.user.id)}`
            );
            const profileData = await response.json();

            if (response.ok && profileData.profile) {
              setUser({
                id: profileData.profile.id,
                email: profileData.profile.email || "",
                role: profileData.profile.role || "salesperson",
                name: profileData.profile.name || "",
                phone: profileData.profile.phone,
              });
            } else {
              setUser({
                id: session.user.id,
                email: session.user.email || "",
                role: "salesperson",
                name: session.user.email || "",
              });
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              role: "salesperson",
              name: session.user.email || "",
            });
          }
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
