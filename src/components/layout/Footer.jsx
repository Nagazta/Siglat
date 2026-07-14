import { Link } from "react-router-dom";
import { Zap, ExternalLink, Shield, Info, Heart } from "lucide-react";

const FOOTER_LINKS = [
  { href: "https://github.com", label: "GitHub", icon: ExternalLink, external: true },
  { to: "/about", label: "About", icon: Info },
  { to: "/about#privacy", label: "Privacy", icon: Shield },
];

/**
 * Application Footer — dark grid-ink theme.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-grid-ink border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* ── Brand ── */}
          <div className="flex flex-col items-center md:items-start gap-1.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-live-amber">
                <Zap size={14} strokeWidth={2.5} className="text-grid-ink" />
              </div>
              <span className="font-bold text-spark-white">
                Siglat <span className="text-live-amber">PH</span>
              </span>
            </div>
            <p className="text-xs text-spark-white/40 text-center md:text-left">
              Community-powered outage reporting.
            </p>
          </div>

          {/* ── Grid Status Indicator ── */}
          <div className="flex items-center gap-2 px-4 py-2 bg-restored-cyan/10 border border-restored-cyan/20 rounded-full">
            <span className="w-2 h-2 rounded-full bg-restored-cyan animate-pulse-slow" />
            <span className="text-xs font-medium text-restored-cyan font-mono">
              Grid monitoring active
            </span>
          </div>

          {/* ── Links ── */}
          <nav className="flex items-center gap-1" aria-label="Footer navigation">
            {FOOTER_LINKS.map(({ href, to, label, icon: Icon, external }) =>
              external ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-spark-white/40
                             hover:text-live-amber hover:bg-white/5 transition-all duration-150 font-medium"
                  aria-label={label}
                >
                  <Icon size={13} />
                  {label}
                </a>
              ) : (
                <Link
                  key={label}
                  to={to}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-spark-white/40
                             hover:text-live-amber hover:bg-white/5 transition-all duration-150 font-medium"
                >
                  <Icon size={13} />
                  {label}
                </Link>
              )
            )}
          </nav>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-spark-white/30 font-mono">
            © {year} Siglat PH. Open source, community-driven.
          </p>
          <p className="text-xs text-spark-white/30 flex items-center gap-1">
            Made with <Heart size={11} className="text-fault-red fill-fault-red" /> for the Philippines
          </p>
        </div>
      </div>
    </footer>
  );
}
