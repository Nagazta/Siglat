import { useMemo } from "react";
import {
  BarChart2, TrendingUp, MapPin, Award,
  AlertTriangle, CheckCircle, Calendar, Users,
} from "lucide-react";
import Card from "../../components/common/Card";
import Loading from "../../components/common/Loading";
import AreaChart from "../../components/charts/AreaChart";
import BarChart from "../../components/charts/BarChart";
import { useReports } from "../../hooks/useReports";
import { MOCK_STATS } from "../../data/mockData";

// Generate last 7 day labels
function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  });
}

const CHART_COLORS = ["#2563EB", "#475569", "#FBBF24", "#10B981", "#0D9488", "#3B82F6", "#F59E0B", "#EF4444", "#94A3B8", "#1E293B"];

export default function Statistics() {
  const { reports, loading } = useReports();

  const stats = useMemo(() => {
    if (!reports.length) return null;

    const active = reports.filter((r) => r.status === "ongoing").length;
    const scheduled = reports.filter((r) => r.status === "scheduled").length;
    const restored = reports.filter((r) => r.status === "restored").length;

    // Reports per day (last 7 days)
    const days = getLast7Days();
    const recentByDay = days.map((day) => ({
      label: day,
      value: reports.filter((r) => {
        if (!r.createdAt) return false;
        const d = new Date(r.createdAt);
        return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }) === day;
      }).length,
    }));

    // Reports by municipality (top 8)
    const byMuni = Object.entries(
      reports.reduce((acc, r) => {
        const key = r.municipality || "Unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));

    // Most affected barangays
    const byBarangay = Object.entries(
      reports.reduce((acc, r) => {
        const key = r.barangay ? `${r.barangay}, ${r.municipality}` : "Unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));

    // Most confirmed reports
    const mostConfirmed = [...reports]
      .sort((a, b) => b.confirmations - a.confirmations)
      .slice(0, 8)
      .map((r) => ({
        label: `${r.barangay}, ${r.municipality}`.slice(0, 25),
        value: r.confirmations,
      }));

    return { active, scheduled, restored, recentByDay, byMuni, byBarangay, mostConfirmed };
  }, [reports]);

  const STAT_CARDS = [
    {
      id: "total",
      label: "Total Reports",
      value: reports.length || MOCK_STATS.totalReports,
      icon: BarChart2,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      id: "active",
      label: "Active Outages",
      value: stats?.active ?? MOCK_STATS.activeOutages,
      icon: AlertTriangle,
      color: "text-danger",
      bg: "bg-danger/10",
    },
    {
      id: "scheduled",
      label: "Scheduled",
      value: stats?.scheduled ?? MOCK_STATS.scheduledOutages,
      icon: Calendar,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      id: "restored",
      label: "Restored",
      value: stats?.restored ?? MOCK_STATS.restoredToday,
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      id: "contributors",
      label: "Community Reports",
      value: reports.length || MOCK_STATS.communityContributors,
      icon: Users,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 size={22} className="text-primary" />
            Statistics
          </h1>
          <p className="text-muted text-sm mt-1">
            Community outage trends and insights
            {reports.length > 0 && (
              <span className="ml-2 text-primary font-medium">· Live Firestore data</span>
            )}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <Loading size="page" message="Loading statistics..." />
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {STAT_CARDS.map(({ id, label, value, icon: Icon, color, bg }) => (
                <Card key={id}>
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${bg} mb-3`}>
                    <Icon size={20} className={color} />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-800">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted mt-0.5">{label}</p>
                </Card>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Reports by Day */}
              <Card>
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp size={16} className="text-primary" />
                  <h2 className="font-semibold text-slate-800">Reports — Last 7 Days</h2>
                </div>
                {stats?.recentByDay?.length ? (
                  <AreaChart
                    data={stats.recentByDay}
                    dataKey="value"
                    xKey="label"
                    color="#2563EB"
                    name="Reports"
                    height={220}
                  />
                ) : (
                  <EmptyChart message="No reports in the last 7 days" />
                )}
              </Card>

              {/* By Municipality */}
              <Card>
                <div className="flex items-center gap-2 mb-5">
                  <MapPin size={16} className="text-primary" />
                  <h2 className="font-semibold text-slate-800">Reports by Municipality</h2>
                </div>
                {stats?.byMuni?.length ? (
                  <BarChart
                    data={stats.byMuni}
                    dataKey="value"
                    xKey="label"
                    horizontal={true}
                    colors={CHART_COLORS}
                    height={stats.byMuni.length * 32 + 20}
                  />
                ) : (
                  <EmptyChart message="No municipality data yet" />
                )}
              </Card>

              {/* Most Affected Areas */}
              <Card>
                <div className="flex items-center gap-2 mb-5">
                  <AlertTriangle size={16} className="text-danger" />
                  <h2 className="font-semibold text-slate-800">Most Affected Barangays</h2>
                </div>
                {stats?.byBarangay?.length ? (
                  <BarChart
                    data={stats.byBarangay}
                    dataKey="value"
                    xKey="label"
                    horizontal={true}
                    colors={["#EF4444", "#F97316", "#FACC15", "#2563EB", "#475569", "#64748B", "#22C55E", "#94A3B8"]}
                    height={stats.byBarangay.length * 32 + 20}
                  />
                ) : (
                  <EmptyChart message="No barangay data yet" />
                )}
              </Card>

              {/* Most Confirmed */}
              <Card>
                <div className="flex items-center gap-2 mb-5">
                  <Award size={16} className="text-warning" />
                  <h2 className="font-semibold text-slate-800">Most Confirmed Reports</h2>
                </div>
                {stats?.mostConfirmed?.length ? (
                  <BarChart
                    data={stats.mostConfirmed}
                    dataKey="value"
                    xKey="label"
                    horizontal={true}
                    colors={["#FACC15", "#F59E0B", "#D97706", "#B45309", "#92400E", "#78350F", "#2563EB", "#1D4ED8"]}
                    height={stats.mostConfirmed.length * 32 + 20}
                  />
                ) : (
                  <EmptyChart message="No confirmation data yet" />
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex items-center justify-center h-32 bg-slate-50 rounded-xl text-center">
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
