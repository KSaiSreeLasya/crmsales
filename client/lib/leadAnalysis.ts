/**
 * Lead Analysis Utilities
 * Functions for grouping and analyzing leads by time periods
 */

export interface MonthlyLeadStats {
  month: string;
  monthKey: string;
  year: number;
  count: number;
  percentage: number;
}

export interface LeadAnalysis {
  totalLeads: number;
  monthlyData: MonthlyLeadStats[];
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

/**
 * Group leads by month and calculate statistics
 * @param leads Array of leads with created_at timestamp
 * @returns Analysis object with monthly breakdown
 */
export function analyzeLeadsByMonth(
  leads: Array<{
    id?: string;
    created_at?: string | Date;
    [key: string]: any;
  }>,
): LeadAnalysis {
  if (!leads || leads.length === 0) {
    return {
      totalLeads: 0,
      monthlyData: [],
      dateRange: { earliest: null, latest: null },
    };
  }

  const monthMap = new Map<string, number>();
  let earliest: Date | null = null;
  let latest: Date | null = null;

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  leads.forEach((lead) => {
    if (!lead.created_at) return;

    const date = new Date(lead.created_at);

    if (isNaN(date.getTime())) return;

    const year = date.getFullYear();
    const month = date.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthName = monthNames[month];

    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);

    if (!earliest || date < earliest) earliest = date;
    if (!latest || date > latest) latest = date;
  });

  const monthlyData: MonthlyLeadStats[] = Array.from(monthMap.entries())
    .map(([monthKey, count]) => {
      const [year, month] = monthKey.split("-").map(Number);
      const monthName = monthNames[month - 1];

      return {
        month: `${monthName.substring(0, 3)} ${year}`,
        monthKey,
        year,
        count,
        percentage: (count / leads.length) * 100,
      };
    })
    .sort((a, b) => {
      const [yearA, monthA] = a.monthKey.split("-").map(Number);
      const [yearB, monthB] = b.monthKey.split("-").map(Number);
      return yearA !== yearB ? yearA - yearB : monthA - monthB;
    });

  return {
    totalLeads: leads.length,
    monthlyData,
    dateRange: { earliest, latest },
  };
}

/**
 * Get short month label (e.g., "Oct 2024")
 */
export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[month - 1]} ${year}`;
}
