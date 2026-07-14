import { Info, ExternalLink, Heart, Zap, Map, BarChart2, Shield, Globe } from "lucide-react";

const FEATURES = [
  {
    icon: Map,
    title: "Live Map",
    desc: "Interactive map showing all active and historical outages across the Philippines.",
    accentColor: "#FFB020",
  },
  {
    icon: Zap,
    title: "Instant Reports",
    desc: "Report a brownout in under 30 seconds. No sign-up, no account required.",
    accentColor: "#E8432E",
  },
  {
    icon: BarChart2,
    title: "Statistics",
    desc: "Trend charts and area insights powered entirely by community data.",
    accentColor: "#2DD4BF",
  },
  {
    icon: Shield,
    title: "Privacy First",
    desc: "No personal data collected. All reports are anonymous by default.",
    accentColor: "#FFB020",
  },
  {
    icon: Globe,
    title: "Open Source",
    desc: "Fully open source under the MIT license. Fork it, improve it, deploy it.",
    accentColor: "#2DD4BF",
  },
  {
    icon: Heart,
    title: "Community Driven",
    desc: "Built for Filipinos, by the community. Every report makes the grid smarter.",
    accentColor: "#E8432E",
  },
];

const PRINCIPLES = [
  { label: "Transparent", desc: "All data is public and community-verifiable." },
  { label: "Fast", desc: "Reports go live in seconds, not hours." },
  { label: "Accurate", desc: "Confirmations filter noise — the crowd self-corrects." },
  { label: "Offline-resilient", desc: "Works on slow connections common during outages." },
];

/**
 * About page — grid-ink themed.
 */
export default function About() {
  return (
    <div className="animate-fade-in">
      {/* ── Hero ── */}
      <div className="bg-grid-ink grid-bg border-b border-white/5 py-16 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-live-amber/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
            style={{
              background: "rgba(255,176,32,0.12)",
              border: "1px solid rgba(255,176,32,0.25)",
            }}
          >
            <Zap size={28} className="text-live-amber" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-spark-white mb-3 tracking-tight">
            About Siglat PH
          </h1>
          <p className="text-spark-white/50 max-w-xl mx-auto text-base leading-relaxed">
            An open-source, community-powered platform for tracking power outages across the Philippines.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ── Mission ── */}
        <div
          className="rounded-2xl p-8 mb-10"
          style={{
            background: "#fff",
            border: "2px solid #E2E8F0",
            borderLeftColor: "#FFB020",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          }}
        >
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span
              className="inline-block w-1 h-5 rounded-full"
              style={{ background: "#FFB020" }}
            />
            Our Mission
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Siglat PH was built to solve a simple problem: Filipinos have no central, real-time
            source of truth for power outages. We rely on scattered Facebook posts, word of mouth,
            and utility hotlines with long wait times.
          </p>
          <p className="text-slate-600 leading-relaxed mt-3">
            Siglat PH changes that. Anyone can report a brownout, anyone can confirm it, and
            the entire community benefits from aggregated, verified data — free, forever.
          </p>
        </div>

        {/* ── Design Principles ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {PRINCIPLES.map(({ label, desc }) => (
            <div
              key={label}
              className="rounded-xl p-4 text-center"
              style={{
                background: "#1E293B",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <p className="text-sm font-bold text-live-amber font-mono mb-1">{label}</p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(248,250,252,0.45)" }}>
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── Features ── */}
        <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
          <BarChart2 size={20} className="text-live-amber" />
          What We Offer
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {FEATURES.map(({ icon: Icon, title, desc, accentColor }) => (
            <div
              key={title}
              className="flex gap-4 items-start rounded-2xl p-5 transition-all duration-150"
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = accentColor;
                e.currentTarget.style.boxShadow = `0 4px 16px ${accentColor}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E2E8F0";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
              }}
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${accentColor}18` }}
              >
                <Icon size={18} style={{ color: accentColor }} />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{title}</p>
                <p className="text-sm text-muted mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Open Source CTA ── */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "#0B0F14",
            border: "1px solid rgba(255,176,32,0.2)",
            boxShadow: "0 0 40px rgba(255,176,32,0.05)",
          }}
        >
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: "rgba(255,176,32,0.12)", border: "1px solid rgba(255,176,32,0.2)" }}
          >
            <ExternalLink size={22} className="text-live-amber" />
          </div>
          <h2 className="text-lg font-bold text-spark-white mb-2">Open Source</h2>
          <p className="text-sm mb-6 max-w-sm mx-auto leading-relaxed" style={{ color: "rgba(248,250,252,0.45)" }}>
            Siglat PH is open source. Fork it, improve it, or deploy it for your own province.
            Contributions are welcome.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold
                       transition-all duration-150 hover:brightness-110 active:scale-95"
            style={{ background: "#FFB020", color: "#0B0F14" }}
          >
            <ExternalLink size={15} />
            View on GitHub
          </a>
        </div>

        {/* ── Footer note ── */}
        <p className="text-center text-xs mt-8 flex items-center justify-center gap-1"
           style={{ color: "rgba(148,163,184,0.6)" }}>
          Made with <Heart size={11} className="text-fault-red fill-fault-red" /> for the Philippines
        </p>
      </div>
    </div>
  );
}
