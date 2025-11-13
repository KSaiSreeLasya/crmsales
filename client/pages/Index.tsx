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

interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  totalSalespersons: number;
}

export default function Index() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeLeads: 0,
    convertedLeads: 0,
    totalSalespersons: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch actual data from Supabase
    setTimeout(() => {
      setStats({
        totalLeads: 124,
        activeLeads: 87,
        convertedLeads: 37,
        totalSalespersons: 12,
      });
      setIsLoading(false);
    }, 500);
  }, []);

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
    <Card className="border border-border bg-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className="mt-2 flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" /> {trend}
            </p>
          )}
        </div>
        <div className={`rounded-lg ${color} p-3`}>{Icon}</div>
      </div>
    </Card>
  );

  return (
    <CRMLayout>
      <div className="space-y-8 p-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-foreground">Welcome back!</h2>
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
            trend="↑ 12% from last week"
            color="bg-blue-500"
          />
          <StatCard
            icon={<Target className="h-6 w-6 text-white" />}
            label="Active Leads"
            value={stats.activeLeads}
            trend="↑ 8% from last week"
            color="bg-purple-500"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-white" />}
            label="Converted"
            value={stats.convertedLeads}
            trend="↑ 5% from last week"
            color="bg-green-500"
          />
          <StatCard
            icon={<Users className="h-6 w-6 text-white" />}
            label="Team Members"
            value={stats.totalSalespersons}
            color="bg-orange-500"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border border-border bg-card p-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  New Leads
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add leads manually or sync from Google Sheets
                </p>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <Link to="/leads">
              <Button className="mt-6 w-full gap-2">
                <Plus className="h-4 w-4" />
                Manage Leads
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>

          <Card className="border border-border bg-card p-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Team Management
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Assign leads and manage your sales team
                </p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <Link to="/salespersons">
              <Button variant="outline" className="mt-6 w-full gap-2">
                View Team
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Recent Activity
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
                      New lead: John Smith
                    </p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                  <span className="inline-flex rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    New
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Lead assigned to Sarah Johnson
                    </p>
                    <p className="text-xs text-muted-foreground">4 hours ago</p>
                  </div>
                  <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Assigned
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Lead converted: Jane Doe
                    </p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                  <span className="inline-flex rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    Converted
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
