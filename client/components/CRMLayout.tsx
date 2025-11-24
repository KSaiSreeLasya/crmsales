import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

interface CRMLayoutProps {
  children: React.ReactNode;
}

export function CRMLayout({ children }: CRMLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Leads", href: "/leads", icon: Users },
    { label: "Salespersons", href: "/salespersons", icon: UserCheck },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "border-r border-border bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2 font-bold text-lg">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Ffe77690ee7b847c09f597f304a115791%2F5ed4952b10dc4593b47df2356cc6b459?format=webp&width=100"
                alt="Axiso Green Logo"
                className="h-8 w-8 object-contain"
              />
              <span className="text-foreground">Axiso Green</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        <nav className="space-y-2 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-3">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Ffe77690ee7b847c09f597f304a115791%2F5ed4952b10dc4593b47df2356cc6b459?format=webp&width=100"
                alt="Axiso Green Energy Logo"
                className="h-8 w-8 object-contain"
              />
              <div className="flex flex-col">
                <h1 className="text-xl font-semibold text-foreground">
                  Axiso Green Energy
                </h1>
                <p className="text-xs text-muted-foreground">Sales CRM</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-primary"></div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
