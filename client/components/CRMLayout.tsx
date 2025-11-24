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

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Leads", href: "/leads", icon: Users },
    { label: "Salespersons", href: "/salespersons", icon: UserCheck },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Ffe77690ee7b847c09f597f304a115791%2F5ed4952b10dc4593b47df2356cc6b459?format=webp&width=100"
              alt="Axiso Green Energy Logo"
              className="h-12 w-12 object-contain"
            />
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Axiso Green Energy
              </h1>
              <p className="text-base font-bold text-foreground">Sales CRM</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent shadow-md"></div>
          </div>
        </div>
      </header>

      {/* Top Navigation */}
      <nav className="border-b border-border bg-card px-8 py-0">
        <div className="flex items-center justify-center gap-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-4 text-sm font-medium transition-all duration-200 border-b-2 border-transparent",
                  isActive
                    ? "border-primary text-primary"
                    : "text-foreground hover:text-primary",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-background">
        <div className="h-full">{children}</div>
      </main>
    </div>
  );
}
