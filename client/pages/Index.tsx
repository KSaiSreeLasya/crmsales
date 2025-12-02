import { CRMLayout } from "@/components/CRMLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  Users,
  Target,
  Clock,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { MonthlyBreakdown } from "@/components/MonthlyBreakdown";
import { analyzeLeadsByMonth, LeadAnalysis } from "@/lib/leadAnalysis";

interface Lead {
  id: string;
  name: string;
  assigned_to: string;
  next_reminder?: string;
}

interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  totalSalespersons: number;
  leadsByStatus: Record<string, number>;
  leadsBySalesperson: Array<{ name: string; count: number }>;
  upcomingReminders: Lead[];
}

export default function Index() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeLeads: 0,
    convertedLeads: 0,
    totalSalespersons: 0,
    leadsByStatus: {},
    leadsBySalesperson: [],
    upcomingReminders: [],
  });
  const [monthlyAnalysis, setMonthlyAnalysis] = useState<LeadAnalysis>({
    totalLeads: 0,
    monthlyData: [],
    dateRange: { earliest: null, latest: null },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    try {
      // Fetch all leads
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("*");

      if (leadsError) throw leadsError;

      // Fetch all salespersons
      const { data: salespersons, error: salesError } = await supabase
        .from("salespersons")
        .select("*");

      if (salesError) throw salesError;

      const leadsList = leads || [];
      const salespersonsList = salespersons || [];

      // Calculate metrics
      const totalLeads = leadsList.length;
      const convertedLeads = leadsList.filter(
        (l) => l.status === "Lead finished" || l.status === "Advance payment",
      ).length;
      const activeLeads = leadsList.filter(
        (l) =>
          l.status &&
          !["Lead finished", "Not lifted", "Not connected"].includes(l.status),
      ).length;

      // Group by status
      const leadsByStatus: Record<string, number> = {};
      leadsList.forEach((lead) => {
        const status = lead.status || "Unknown";
        leadsByStatus[status] = (leadsByStatus[status] || 0) + 1;
      });

      // Group by salesperson
      const leadsBySalesMap: Record<string, number> = {};
      leadsList.forEach((lead) => {
        const owner = lead.assigned_to || "Unassigned";
        leadsBySalesMap[owner] = (leadsBySalesMap[owner] || 0) + 1;
      });

      const leadsBySalesperson = Object.entries(leadsBySalesMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Get upcoming reminders (next 7 days or overdue)
      const now = new Date();
      const sevenDaysFromNow = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      const upcomingReminders = leadsList
        .filter((lead) => {
          if (!lead.next_reminder) return false;
          const reminderDate = new Date(lead.next_reminder);
          return reminderDate <= sevenDaysFromNow;
        })
        .sort((a, b) => {
          const dateA = new Date(a.next_reminder || "").getTime();
          const dateB = new Date(b.next_reminder || "").getTime();
          return dateA - dateB;
        })
        .slice(0, 5);

      setStats({
        totalLeads,
        activeLeads,
        convertedLeads,
        totalSalespersons: salespersonsList.length,
        leadsByStatus,
        leadsBySalesperson,
        upcomingReminders,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error loading dashboard stats:", errorMessage);
      toast.error("Failed to load dashboard stats");
      setStats({
        totalLeads: 0,
        activeLeads: 0,
        convertedLeads: 0,
        totalSalespersons: 0,
        leadsByStatus: {},
        leadsBySalesperson: [],
        upcomingReminders: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    trend,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    trend?: string;
    color: string;
  }) => (
    <Card className="border border-border bg-card p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {value}
          </p>
          {trend && (
            <p className="mt-2 flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" /> {trend}
            </p>
          )}
        </div>
        <div className={`rounded-lg ${color} p-3 shadow-md`}>{Icon}</div>
      </div>
    </Card>
  );

  return (
    <CRMLayout>
      <div className="space-y-8 p-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome back!
          </h2>
          <p className="mt-2 text-muted-foreground">
            Here's what's happening with your sales today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-6 w-6 text-white" />}
            label="Total Leads"
            value={stats.totalLeads}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard
            icon={<Target className="h-6 w-6 text-white" />}
            label="Active Leads"
            value={stats.activeLeads}
            color="bg-gradient-to-br from-primary to-accent"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-white" />}
            label="Converted"
            value={stats.convertedLeads}
            color="bg-gradient-to-br from-green-500 to-emerald-600"
          />
          <StatCard
            icon={<Users className="h-6 w-6 text-white" />}
            label="Team Members"
            value={stats.totalSalespersons}
            color="bg-gradient-to-br from-orange-500 to-red-600"
          />
        </div>

        {/* Metrics by Salesperson and Status */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Leads by Salesperson */}
          <Card className="border border-border bg-card p-6 hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Leads by Salesperson
            </h3>
            <div className="mt-6 space-y-4">
              {isLoading ? (
                <p className="text-center text-muted-foreground">Loading...</p>
              ) : stats.leadsBySalesperson.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No leads assigned yet
                </p>
              ) : (
                stats.leadsBySalesperson.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${Math.min(
                              (item.count /
                                Math.max(
                                  ...stats.leadsBySalesperson.map(
                                    (s) => s.count,
                                  ),
                                  1,
                                )) *
                                100,
                              100,
                            )}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-foreground w-8">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Leads by Status */}
          <Card className="border border-border bg-card p-6 hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Leads by Status
            </h3>
            <div className="mt-6 space-y-4">
              {isLoading ? (
                <p className="text-center text-muted-foreground">Loading...</p>
              ) : Object.keys(stats.leadsByStatus).length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No leads available
                </p>
              ) : (
                Object.entries(stats.leadsByStatus)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between border-b border-border pb-3 last:border-b-0"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {status}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{
                              width: `${Math.min(
                                (count /
                                  Math.max(
                                    ...Object.values(stats.leadsByStatus),
                                    1,
                                  )) *
                                  100,
                                100,
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-foreground w-8">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </Card>
        </div>

        {/* Upcoming Reminders */}
        <Card className="border border-orange-200 bg-orange-50 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-orange-800">
              <Clock className="h-5 w-5" />
              Upcoming Reminders (Next 7 Days)
            </h3>
            <Link
              to="/leads"
              className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-center text-muted-foreground">Loading...</p>
            ) : stats.upcomingReminders.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No reminders for the next 7 days
              </p>
            ) : (
              stats.upcomingReminders.map((reminder) => {
                const reminderDate = new Date(reminder.next_reminder || "");
                const isOverdue = reminderDate < new Date();
                return (
                  <div
                    key={reminder.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isOverdue
                        ? "bg-red-100 border-red-300"
                        : "bg-white border-orange-200"
                    }`}
                  >
                    <div className="flex-1">
                      <p
                        className={`font-semibold text-sm ${isOverdue ? "text-red-800" : "text-foreground"}`}
                      >
                        {reminder.name}
                      </p>
                      <p
                        className={`text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}
                      >
                        Assigned to: {reminder.assigned_to || "Unassigned"}
                      </p>
                    </div>
                    <div
                      className={`text-right text-xs font-semibold px-3 py-1 rounded ${
                        isOverdue
                          ? "bg-red-200 text-red-800"
                          : "bg-orange-200 text-orange-800"
                      }`}
                    >
                      {isOverdue
                        ? "OVERDUE"
                        : reminderDate.toLocaleDateString("en-IN")}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-8 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  New Leads
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add leads manually or sync from Google Sheets
                </p>
              </div>
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <Link to="/leads">
              <Button className="mt-6 w-full gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-lg">
                <Plus className="h-4 w-4" />
                Manage Leads
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>

          <Card className="border border-primary/30 bg-gradient-to-br from-secondary/50 to-primary/5 p-8 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Team Management
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Assign leads and manage your sales team
                </p>
              </div>
              <Users className="h-5 w-5 text-primary" />
            </div>
            <Link to="/team">
              <Button
                variant="outline"
                className="mt-6 w-full gap-2 border-primary text-primary hover:bg-primary/10"
              >
                View Team
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border border-border bg-card p-6 hover:shadow-lg transition-all duration-300">
          <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Quick Stats
          </h3>
          <div className="mt-6 space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground">
                Loading activity...
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Conversion Rate
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.totalLeads > 0
                        ? Math.round(
                            (stats.convertedLeads / stats.totalLeads) * 100,
                          )
                        : 0}
                      % of total leads converted
                    </p>
                  </div>
                  <span className="text-xl font-bold text-green-600">
                    {stats.totalLeads > 0
                      ? Math.round(
                          (stats.convertedLeads / stats.totalLeads) * 100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Average Leads per Salesperson
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total leads distributed across team
                    </p>
                  </div>
                  <span className="text-xl font-bold text-blue-600">
                    {stats.totalSalespersons > 0
                      ? Math.round(stats.totalLeads / stats.totalSalespersons)
                      : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Leads Status Distribution
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Object.keys(stats.leadsByStatus).length} different
                      statuses
                    </p>
                  </div>
                  <span className="text-xl font-bold text-purple-600">
                    {Object.keys(stats.leadsByStatus).length}
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </CRMLayout>
  );
}
