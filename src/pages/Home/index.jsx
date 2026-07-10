import { Link } from "react-router-dom";
import { Map, AlertTriangle, Activity, Users, FileText, HelpCircle, ArrowRight, CheckCircle, Zap } from "lucide-react";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import AnimatedCounter from "../../components/common/AnimatedCounter";
import { MOCK_STATS, MOCK_REPORTS } from "../../data/mockData";
import { useReports } from "../../hooks/useReports";
import { timeAgo } from "../../utils";

const OVERVIEW_CARD_CONFIG = [
  {
    id: "active-outages",
    label: "Active Outages",
    icon: Zap,
    color: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/20",
  },
  {
    id: "today-reports",
    label: "Today's Reports",
    icon: FileText,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    id: "confirmed-reports",
    label: "Confirmed Reports",
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
  },
  {
    id: "contributors",
    label: "Contributors",
    icon: Users,
    color: "text-secondary",
    bg: "bg-secondary/10",
    border: "border-secondary/20",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: AlertTriangle,
    title: "Spot a Brownout",
    desc: "Notice a power interruption in your area? Report it in seconds.",
  },
  {
    step: "02",
    icon: Map,
    title: "Pin it on the Map",
    desc: "Your report appears on the live map immediately for the community.",
  },
  {
    step: "03",
    icon: CheckCircle,
    title: "Community Confirms",
    desc: "Neighbors confirm or update the report, making it more accurate.",
  },
  {
    step: "04",
    icon: Activity,
    title: "Track & Stay Informed",
    desc: "Monitor restoration status and browse historical outage data.",
  },
];

const FAQS = [
  {
    q: "Is Siglat PH free?",
    a: "Yes, completely free and open source. No login required to view or report outages.",
  },
  {
    q: "How accurate are the reports?",
    a: "Reports are community-confirmed. The more confirmations, the more reliable the data.",
  },
  {
    q: "How do I report a brownout?",
    a: 'Click "Report Brownout" in the Navbar or on this page, fill in your barangay details, and submit.',
  },
  {
    q: "Which areas are covered?",
    a: "All provinces across the Philippines. If your area isn't listed, report it and it'll be added.",
  },
];

export default function Home() {
  const { reports } = useReports();

  // Dynamic calculations based on live reports from context/Firestore
  const activeCount = reports.filter((r) => r.status === "ongoing").length;
  const todayCount = reports.filter((r) => {
    if (!r.createdAt) return false;
    const date = new Date(r.createdAt);
    return date.toDateString() === new Date().toDateString();
  }).length;
  const confirmedCount = reports.reduce((acc, r) => acc + (r.confirmations || 0), 0);
  const contributorsCount = reports.length > 0 ? reports.length + 42 : MOCK_STATS.communityContributors;

  const statsMap = {
    "active-outages": reports.length > 0 ? activeCount : MOCK_STATS.activeOutages,
    "today-reports": reports.length > 0 ? todayCount : MOCK_STATS.todayReports,
    "confirmed-reports": reports.length > 0 ? confirmedCount : MOCK_STATS.confirmedReports,
    contributors: contributorsCount,
  };

  const displayReports = reports.length > 0 ? reports.slice(0, 3) : MOCK_REPORTS.slice(0, 3);

  return (
    <div className="animate-fade-in">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-secondary py-20 sm:py-28">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-white text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
            Live — Community Driven
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-5">
            Community{" "}
            <span className="text-accent">Brownout</span>{" "}
            Tracker
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Track and report power outages across the Philippines with the help of the community.
            Real-time, transparent, and free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/map"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-primary font-bold
                         text-base transition-all duration-200 hover:bg-slate-50 hover:shadow-xl active:scale-95"
            >
              <Map size={18} />
              View Live Map
            </Link>
            <Link
              to="/reports?action=new"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border-2 border-white text-white font-bold
                         text-base transition-all duration-200 hover:bg-white/10 active:scale-95"
            >
              <AlertTriangle size={18} />
              Report Brownout
            </Link>
          </div>
        </div>
      </section>

      {/* ── Overview Cards ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {OVERVIEW_CARD_CONFIG.map(({ id, label, icon: Icon, color, bg, border }) => (
            <Card key={id} className={`border ${border} animate-slide-up`}>
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${bg} mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-2xl font-extrabold text-slate-800">
                <AnimatedCounter value={statsMap[id]} />
              </p>
              <p className="text-sm text-muted mt-0.5">{label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Latest Reports ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Latest Reports</h2>
            <p className="text-muted text-sm mt-1">Most recently reported outages</p>
          </div>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1 text-sm text-primary font-semibold hover:gap-2 transition-all"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayReports.map((report) => {
            return (
              <Card key={report.id} hoverable className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge status={report.status} />
                  <span className="text-xs text-muted">{timeAgo(report.createdAt)}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{report.barangay}</p>
                  <p className="text-sm text-muted">{report.municipality}, {report.province}</p>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{report.notes}</p>
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-xs text-muted">
                    👍 {report.confirmations} confirmations
                  </span>
                  <Link
                    to={`/reports/${report.id}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Details →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-white border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-800">How It Works</h2>
            <p className="text-muted mt-2">Simple. Community-powered. Accurate.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon size={24} className="text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-xs font-bold text-primary bg-accent/20 rounded-full w-5 h-5 flex items-center justify-center">
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
              <HelpCircle size={24} className="text-primary" />
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
