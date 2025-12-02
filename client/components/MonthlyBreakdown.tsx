import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { LeadAnalysis } from "@/lib/leadAnalysis";

interface MonthlyBreakdownProps {
  analysis: LeadAnalysis;
  isLoading?: boolean;
}

export function MonthlyBreakdown({
  analysis,
  isLoading = false,
}: MonthlyBreakdownProps) {
  const chartData = analysis.monthlyData.map((item) => ({
    name: item.month,
    leads: item.count,
    percentage: parseFloat(item.percentage.toFixed(1)),
  }));

  return (
    <Card className="border border-border bg-card p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Leads by Month
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Monthly distribution of leads
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">
            {analysis.totalLeads}
          </p>
          <p className="text-xs text-muted-foreground">Total Leads</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">Loading monthly data...</p>
        </div>
      ) : analysis.monthlyData.length === 0 ? (
        <div className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">No leads data available</p>
        </div>
      ) : (
        <>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value, name) => {
                    if (name === "leads") return [value, "Leads"];
                    if (name === "percentage")
                      return [`${value}%`, "Percentage"];
                    return value;
                  }}
                />
                <Legend />
                <Bar
                  dataKey="leads"
                  fill="#3b82f6"
                  name="Number of Leads"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Breakdown Table */}
          <div className="mt-8 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">
                    Month
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">
                    Count
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">
                    Percentage
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-foreground">
                    Visual
                  </th>
                </tr>
              </thead>
              <tbody>
                {analysis.monthlyData.map((item) => (
                  <tr
                    key={item.monthKey}
                    className="border-b border-border hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {item.month}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-primary">
                      {item.count}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                      {item.percentage.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="h-2 w-32 rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                            style={{
                              width: `${Math.min(item.percentage * 5, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Date Range Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Date Range:</span>{" "}
              {analysis.dateRange.earliest
                ? analysis.dateRange.earliest.toLocaleDateString("en-IN")
                : "N/A"}{" "}
              to{" "}
              {analysis.dateRange.latest
                ? analysis.dateRange.latest.toLocaleDateString("en-IN")
                : "N/A"}
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
