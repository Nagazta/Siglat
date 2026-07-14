import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Map, AlertTriangle, Activity, Users, FileText, HelpCircle,
  ArrowRight, CheckCircle, Zap, Radio, ShieldCheck,
} from "lucide-react";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import SourceTag from "../../components/common/SourceTag";
import AnimatedCounter from "../../components/common/AnimatedCounter";
import { MOCK_STATS, MOCK_REPORTS } from "../../data/mockData";
import { useReports } from "../../hooks/useReports";
import { timeAgo, isNew } from "../../utils";

/* ─── Voltage Waveform SVG ──────────────────────────────────────────────── */
/**
 * Draws an oscilloscope-style voltage waveform across the hero.
 * Flat/steady most of the time; has one glitch spike on load.
 */
function VoltageWaveform({ hasActiveOutages }) {
  // Build a repeating sine-like path with one spike segment
  const W = 1200;
  const H = 80;
  const mid = H / 2;
  const seg = 60; // pixels per wave cycle

  let d = `M 0 ${mid}`;
  const cycles = Math.ceil(W / seg);

  for (let i = 0; i < cycles; i++) {
    const x0 = i * seg;
    const spike = hasActiveOutages && i === Math.floor(cycles * 0.62);

    if (spike) {
      // Voltage spike — sharp up-down glitch
      d += ` L ${x0 + 5} ${mid}`;
      d += ` L ${x0 + 10} ${mid - 38}`;
      d += ` L ${x0 + 18} ${mid + 32}`;
      d += ` L ${x0 + 24} ${mid - 18}`;
      d += ` L ${x0 + 30} ${mid}`;
    } else {
      // Normal smooth sine-ish curve
      const amp = 12;
      d += ` C ${x0 + seg * 0.25} ${mid - amp}, ${x0 + seg * 0.75} ${mid + amp}, ${x0 + seg} ${mid}`;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 w-full opacity-25 pointer-events-none"
      style={{ height: "80px" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFB020" stopOpacity="0" />
          <stop offset="20%" stopColor="#FFB020" stopOpacity="1" />
          <stop offset="80%" stopColor="#FFB020" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFB020" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="url(#waveGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="waveform-path"
      />
    </svg>
  );
}

/* ─── Meter Stat Card ───────────────────────────────────────────────────── */
function MeterCard({ icon: Icon, label, value, meterWidth, meterColor, subLabel, iconColor, iconBg }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-2 animate-slide-up"
      style={{
        background: "#1E293B",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Icon */}
      <div
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl"
        style={{ background: `${iconColor}22` }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>

      {/* Value — monospace meter readout */}
      <div>
        <p
          className="text-2xl font-bold font-mono tabular-nums leading-none"
          style={{ color: "#F8FAFC" }}
        >
          <AnimatedCounter value={value} />
        </p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(248,250,252,0.4)" }}>{label}</p>
        {subLabel && (
          <p className="text-[10px] font-mono mt-1" style={{ color: meterColor }}>
            {subLabel}
          </p>
        )}
      </div>

      {/* Meter fill bar at bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <div
          className="h-full rounded-full animate-meter-fill"
          style={{
            "--meter-width": meterWidth,
            background: meterColor,
            boxShadow: `0 0 6px ${meterColor}`,
          }}
        />
      </div>
    </div>
  );
}

/* ─── HOW IT WORKS ──────────────────────────────────────────────────────── */
const HOW_IT_WORKS = [
  {
    step: "01",
    icon: AlertTriangle,
    title: "Spot an Outage",
    desc: "Power's out in your area? Report it in under 30 seconds.",
  },
  {
    step: "02",
    icon: Map,
    title: "It hits the map",
    desc: "Your report pins to the live grid map immediately — visible to your whole barangay.",
  },
  {
    step: "03",
    icon: CheckCircle,
    title: "Neighbors confirm",
    desc: "Community confirmations make the data more accurate and trustworthy.",
  },
  {
    step: "04",
    icon: Activity,
    title: "Track restoration",
    desc: "Follow restoration status and browse area history without refreshing.",
  },
];

const FAQS = [
  {
    q: "Is Siglat PH free?",
    a: "Yes — completely free and open source. No account needed to view or report outages.",
  },
  {
    q: "How accurate are the reports?",
    a: "Reports are community-confirmed. More confirmations = more reliable. One report is a heads-up; ten is a fact.",
  },
  {
    q: "How do I report a brownout?",
    a: 'Hit "Report Outage" in the top bar or this page, fill in your barangay details, and submit. Takes under a minute.',
  },
  {
    q: "Which areas are covered?",
    a: "All provinces across the Philippines. If your area's missing, report it anyway — it'll get added.",
  },
];

/* ─── Main Component ────────────────────────────────────────────────────── */
export default function Home() {
  const { reports } = useReports();

  const activeCount     = reports.filter((r) => r.status === "ongoing").length;
  const todayCount      = reports.filter((r) => {
    if (!r.createdAt) return false;
    return new Date(r.createdAt).toDateString() === new Date().toDateString();
  }).length;
  const confirmedCount  = reports.reduce((acc, r) => acc + (r.confirmations || 0), 0);
  const contributorsCount = reports.length > 0 ? reports.length + 42 : MOCK_STATS.communityContributors;

  const hasData = reports.length > 0;

  const meterCards = [
    {
      id: "active",
      icon: Zap,
      label: "Active Outages",
      value: hasData ? activeCount : MOCK_STATS.activeOutages,
      meterColor: "#E8432E",
      meterWidth: hasData ? `${Math.min(activeCount * 10 + 5, 100)}%` : "20%",
      iconColor: "#E8432E",
      subLabel: activeCount === 0 ? "Grid stable in your feed" : `${activeCount} area${activeCount !== 1 ? "s" : ""} affected`,
    },
    {
      id: "today",
      icon: FileText,
      label: "Today's Reports",
      value: hasData ? todayCount : MOCK_STATS.todayReports,
      meterColor: "#FFB020",
      meterWidth: hasData ? `${Math.min(todayCount * 8 + 5, 100)}%` : "35%",
      iconColor: "#FFB020",
      subLabel: todayCount === 0 ? "No new reports today" : null,
    },
    {
      id: "confirmed",
      icon: ShieldCheck,
      label: "Confirmed Reports",
      value: hasData ? confirmedCount : MOCK_STATS.confirmedReports,
      meterColor: "#2DD4BF",
      meterWidth: hasData ? `${Math.min(confirmedCount / 2 + 5, 100)}%` : "60%",
      iconColor: "#2DD4BF",
      subLabel: null,
    },
    {
      id: "contributors",
      icon: Users,
      label: "Contributors",
      value: contributorsCount,
      meterColor: "#94A3B8",
      meterWidth: "75%",
      iconColor: "#94A3B8",
      subLabel: null,
    },
  ];

  const displayReports = hasData ? reports.slice(0, 3) : MOCK_REPORTS.slice(0, 3);

  return (
    <div className="animate-fade-in">
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden py-20 sm:py-28"
        style={{ background: "#0B0F14", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Ambient glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(255,176,32,0.05)" }} />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl" style={{ background: "rgba(232,67,46,0.05)" }} />
        </div>

        {/* Voltage waveform — drawn on load */}
        <VoltageWaveform hasActiveOutages={activeCount > 0} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Live pill */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium mb-6 backdrop-blur-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(248,250,252,0.7)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-slow" style={{ background: "#2DD4BF" }} />
            Grid Monitoring Active
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-5 tracking-tight"
            style={{ color: "#F8FAFC" }}
          >
            Community{" "}
            <span style={{ color: "#FFB020" }}>Brownout</span>{" "}
            Tracker
          </h1>
          <p
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "rgba(248,250,252,0.6)" }}
          >
            Check your area's grid status — live, from your neighbors.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm
                         transition-all duration-150 hover:brightness-110 active:scale-95"
              style={{ background: "#FFB020", color: "#0B0F14" }}
            >
              <Map size={16} />
              Check Your Area
            </Link>
            <Link
              to="/reports?action=new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm
                         transition-all duration-150 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#F8FAFC",
              }}
            >
              <AlertTriangle size={16} />
              Report an Outage
            </Link>
          </div>
        </div>
      </section>

      {/* ── Meter Stat Cards ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {meterCards.map((card) => (
            <MeterCard key={card.id} {...card} />
          ))}
        </div>
      </section>

      {/* ── Latest Reports ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Latest Reports</h2>
            <p className="text-muted text-sm mt-1">Most recently reported outages in your area</p>
          </div>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1 text-sm text-live-amber font-semibold
                       hover:gap-2 transition-all duration-150"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayReports.map((report) => (
            <div
              key={report.id}
              className="bg-white border border-circuit-light rounded-2xl p-5 shadow-card
                         flex flex-col gap-3 transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5
                         border-l-2"
              style={{
                borderLeftColor:
                  report.status === "ongoing"   ? "#E8432E"
                  : report.status === "restored" ? "#2DD4BF"
                  : "#FFB020",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge status={report.status} />
                  {isNew(report.createdAt) && (
                    <span
                      className="animate-flicker inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-black tracking-widest uppercase"
                      style={{
                        background: "linear-gradient(90deg, #78350f 0%, #92400e 50%, #78350f 100%)",
                        color: "#fde68a",
                        border: "1px solid #fbbf24",
                        boxShadow: "0 0 6px #fbbf2466, 0 0 14px #f59e0b33",
                      }}
                    >
                      ⚡ NEW
                    </span>
                  )}
                  <SourceTag sourceUrl={report.sourceUrl} />
                </div>
                <span className="text-xs text-muted font-mono flex-shrink-0">
                  {timeAgo(report.createdAt)}
                </span>
              </div>

              <div>
                <p className="font-semibold text-slate-800">{report.barangay}</p>
                <p className="text-sm text-muted">{report.municipality}, {report.province}</p>
              </div>
              {report.notes && (
                <p className="text-sm text-slate-600 line-clamp-2">{report.notes}</p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-circuit-light">
                <span className="text-xs text-muted font-mono">
                  {report.confirmations} confirmation{report.confirmations !== 1 ? "s" : ""}
                </span>
                <Link
                  to={`/reports/${report.id}`}
                  className="text-xs font-semibold text-live-amber hover:underline"
                >
                  Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Circuit Trace Divider ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="circuit-divider" />
      </div>

      {/* ── How It Works ── */}
      <section className="bg-white border-y border-circuit-light py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-800">How It Works</h2>
            <p className="text-muted mt-2">Simple. Community-powered. Accurate.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-grid-ink flex items-center justify-center">
                    <Icon size={24} className="text-live-amber" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-[10px] font-bold font-mono text-live-amber
                                   bg-live-amber/10 border border-live-amber/30 rounded-full w-5 h-5
                                   flex items-center justify-center">
                    {step.slice(-1)}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
              <HelpCircle size={24} className="text-live-amber" />
              Frequently Asked Questions
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {FAQS.map(({ q, a }, i) => (
              <Card key={i} padding="default">
                <h3 className="font-semibold text-slate-800 mb-1.5">{q}</h3>
                <p className="text-sm text-muted leading-relaxed">{a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
