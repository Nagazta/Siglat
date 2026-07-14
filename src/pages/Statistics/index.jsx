import { useMemo } from "react";
import {
  Zap, TrendingUp, MapPin, Award,
  AlertTriangle, CheckCircle, Calendar, Users, BarChart2,
} from "lucide-react";
import Loading from "../../components/common/Loading";
import AreaChart from "../../components/charts/AreaChart";
import BarChart from "../../components/charts/BarChart";
import { useReports } from "../../hooks/useReports";
import { MOCK_STATS } from "../../data/mockData";

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  });
}

// Grid-token chart palettes
const FAULT_PALETTE   = ["#E8432E", "#f06448", "#f4856f", "#f8a695", "#fcc8bb", "#fee1d8", "#E8432E", "#c93525"];
const AMBER_PALETTE   = ["#FFB020", "#ffc04d", "#ffd080", "#ffe0b3", "#fff0d9", "#FFB020", "#e09000", "#c07800"];
const CYAN_PALETTE    = ["#2DD4BF", "#5edfce", "#8eead e", "#bef5f0", "#2DD4BF", "#22b8a6", "#19a090", "#0f8878"];
const MULTI_PALETTE   = ["#FFB020", "#E8432E", "#2DD4BF", "#94A3B8", "#ffc04d", "#f06448", "#5edfce", "#b0bec5"];

export default function Statistics() {
  const { reports, loading } = useReports();

  const stats = useMemo(() => {
    if (!reports.length) return null;

    const active    = reports.filter((r) => r.status === "ongoing").length;
    const scheduled = reports.filter((r) => r.status === "scheduled").length;
    const restored  = reports.filter((r) => r.status === "restored").length;

    const days = getLast7Days();
    const recentByDay = days.map((day) => ({
      label: day,
      value: reports.filter((r) => {
        if (!r.createdAt) return false;
        return new Date(r.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) === day;
      }).length,
    }));

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
      accentColor: "#FFB020",
      meterWidth: "70%",
    },
    {
      id: "active",
      label: "Active Outages",
      value: stats?.active ?? MOCK_STATS.activeOutages,
      icon: AlertTriangle,
      accentColor: "#E8432E",
      meterWidth: stats?.active ? `${Math.min(stats.active * 10, 100)}%` : "15%",
    },
    {
      id: "scheduled",
      label: "Scheduled",
      value: stats?.scheduled ?? MOCK_STATS.scheduledOutages,
      icon: Calendar,
      accentColor: "#FFB020",
      meterWidth: stats?.scheduled ? `${Math.min(stats.scheduled * 8, 100)}%` : "30%",
    },
    {
      id: "restored",
      label: "Restored",
      value: stats?.restored ?? MOCK_STATS.restoredToday,
      icon: CheckCircle,
      accentColor: "#2DD4BF",
      meterWidth: stats?.restored ? `${Math.min(stats.restored * 8, 100)}%` : "40%",
    },
    {
      id: "contributors",
      label: "Community Reports",
      value: reports.length || MOCK_STATS.communityContributors,
      icon: Users,
      accentColor: "#94A3B8",
      meterWidth: "80%",
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="bg-grid-ink border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-spark-white flex items-center gap-2">
            <BarChart2 size={22} className="text-live-amber" />
            Statistics
          </h1>
          <p className="text-spark-white/40 text-sm mt-1 font-mono">
            Community outage trends and insights
            {reports.length > 0 && (
              <span className="ml-2 text-restored-cyan">· Live data</span>
            )}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <Loading size="page" message="Reading grid data..." />
        ) : (
          <>
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {STAT_CARDS.map(({ id, label, value, icon: Icon, accentColor, meterWidth }) => (
                <div
                  key={id}
                  className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-2"
                  style={{
                    background: "#1E293B",
                    border: "1px solid rgba(255,255,255,0.05)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                  }}
                >
                  <div
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl"
                    style={{ background: `${accentColor}20` }}
                  >
                    <Icon size={18} style={{ color: accentColor }} />
                  </div>
                  <div>
                    <p
                      className="text-2xl font-bold font-mono tabular-nums leading-none"
                      style={{ color: "#F8FAFC" }}
                    >
                      {value.toLocaleString()}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(248,250,252,0.4)" }}>
                      {label}
                    </p>
                  </div>
                  {/* Meter bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
                    <div
                      className="h-full rounded-full animate-meter-fill"
                      style={{
                        "--meter-width": meterWidth,
                        background: accentColor,
                        boxShadow: `0 0 6px ${accentColor}`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Charts ── */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Reports by Day */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp size={16} style={{ color: "#FFB020" }} />
                  <h2 className="font-semibold text-slate-800">Reports — Last 7 Days</h2>
                </div>
                {stats?.recentByDay?.length ? (
                  <AreaChart
                    data={stats.recentByDay}
                    dataKey="value"
                    xKey="label"
                    color="#FFB020"
                    name="Reports"
                    height={220}
                  />
                ) : (
                  <EmptyChart message="No reports in the last 7 days" />
                )}
              </div>

              {/* By Municipality */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <MapPin size={16} style={{ color: "#FFB020" }} />
                  <h2 className="font-semibold text-slate-800">Reports by Municipality</h2>
                </div>
                {stats?.byMuni?.length ? (
                  <BarChart
                    data={stats.byMuni}
                    dataKey="value"
                    xKey="label"
                    horizontal={true}
                    colors={MULTI_PALETTE}
                    height={stats.byMuni.length * 32 + 20}
                  />
                ) : (
                  <EmptyChart message="No municipality data yet" />
                )}
              </div>

              {/* Most Affected Barangays */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <AlertTriangle size={16} style={{ color: "#E8432E" }} />
                  <h2 className="font-semibold text-slate-800">Most Affected Barangays</h2>
                </div>
                {stats?.byBarangay?.length ? (
                  <BarChart
                    data={stats.byBarangay}
                    dataKey="value"
                    xKey="label"
                    horizontal={true}
                    colors={FAULT_PALETTE}
                    height={stats.byBarangay.length * 32 + 20}
                  />
                ) : (
                  <EmptyChart message="No barangay data yet" />
                )}
              </div>

              {/* Most Confirmed */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Award size={16} style={{ color: "#FFB020" }} />
                  <h2 className="font-semibold text-slate-800">Most Confirmed Reports</h2>
                </div>
                {stats?.mostConfirmed?.length ? (
                  <BarChart
                    data={stats.mostConfirmed}
                    dataKey="value"
                    xKey="label"
                    horizontal={true}
                    colors={AMBER_PALETTE}
                    height={stats.mostConfirmed.length * 32 + 20}
                  />
                ) : (
                  <EmptyChart message="No confirmation data yet" />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div
      className="flex items-center justify-center h-32 rounded-xl text-center"
      style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
    >
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
