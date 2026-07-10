import { Info, ExternalLink, Heart, Zap, Map, BarChart2, Shield, Globe } from "lucide-react";
import Card from "../../components/common/Card";

const FEATURES = [
  { icon: Map, title: "Live Map", desc: "Interactive map showing all active and historical outages." },
  { icon: Zap, title: "Instant Reports", desc: "Report a brownout in under 30 seconds. No sign-up required." },
  { icon: BarChart2, title: "Statistics", desc: "Trend charts and area insights powered by community data." },
  { icon: Shield, title: "Privacy First", desc: "No personal data collected. Reports are anonymous by default." },
  { icon: Globe, title: "Open Source", desc: "Fully open source under the MIT license. Contributions welcome." },
  { icon: Heart, title: "Community Driven", desc: "Built for Filipinos, by the community, for the community." },
];

/**
 * About page.
 */
export default function About() {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-slate-900 grid-bg py-16 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-slate-800 border border-slate-700/80 text-amber-400 mb-5">
            <Info size={28} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            About Siglat PH
          </h1>
          <p className="text-slate-300 max-w-xl mx-auto text-base leading-relaxed">
            An open-source, community-powered platform for tracking power outages across the Philippines.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Mission */}
        <Card className="mb-10">
          <h2 className="text-xl font-bold text-slate-800 mb-3">Our Mission</h2>
          <p className="text-slate-600 leading-relaxed">
            Siglat PH was built to solve a simple problem: Filipinos have no central, real-time
            source of truth for power outages. We rely on scattered Facebook posts, word of mouth,
            and utility hotlines with long wait times.
          </p>
          <p className="text-slate-600 leading-relaxed mt-3">
            Siglat PH changes that. Anyone can report a brownout, anyone can confirm it, and
            the entire community benefits from the aggregated, verified data.
          </p>
        </Card>

        {/* Features */}
        <h2 className="text-xl font-bold text-slate-800 mb-5">What We Offer</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} hoverable className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon size={18} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{title}</p>
                <p className="text-sm text-muted mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Open Source */}
        <Card className="text-center">
          <ExternalLink size={32} className="mx-auto mb-3 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Open Source</h2>
          <p className="text-muted text-sm mb-4 leading-relaxed">
            Siglat PH is open source. Fork it, improve it, or deploy it for your own province.
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-white font-semibold
                       text-sm transition-all duration-200 hover:bg-slate-700 active:scale-95"
          >
            <ExternalLink size={16} />
            View on GitHub
          </a>
        </Card>
      </div>
    </div>
  );
}
