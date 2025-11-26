import { Link, useLocation } from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  Users,
  UserCheck,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface CRMLayoutProps {
  children: React.ReactNode;
}

export function CRMLayout({ children }: CRMLayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Leads", href: "/leads", icon: Users },
    // Show Team to all users (salespersons see View Team, admins can see Team Management)
    {
      label: user?.role === "admin" ? "Team Management" : "View Team",
      href: "/team",
      icon: UserCheck,
    },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card">
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <h1 className="text-2xl font-bold text-primary">Axiso Green</h1>
            <p className="text-xs text-muted-foreground mt-1">Sales CRM</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info and Logout */}
          <div className="p-4 border-t border-border space-y-2">
            <div className="px-4 py-2 bg-accent rounded-lg">
              <p className="text-xs text-muted-foreground">Logged in as:</p>
              <p className="text-sm font-semibold text-foreground">
                {user?.name}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.role}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="h-16 px-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Axiso Green Energy
              </h2>
              <p className="text-sm text-muted-foreground">Sales Management</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
