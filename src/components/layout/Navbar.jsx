import { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { Zap, Menu, X, AlertTriangle, Bell } from "lucide-react";
import clsx from "clsx";
import SubscribeModal from "../common/SubscribeModal";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/map", label: "Live Map" },
  { to: "/reports", label: "Reports" },
  { to: "/statistics", label: "Statistics" },
  { to: "/about", label: "About" },
];

/**
 * Main application Navbar — dark grid-ink theme.
 * - Sticky with blur backdrop on scroll
 * - Active route: live-amber underline indicator
 * - Responsive hamburger menu for mobile
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
    <header
      className={clsx(
        "sticky top-0 z-40 bg-grid-ink/95 backdrop-blur-md border-b transition-all duration-150",
        scrolled
          ? "border-live-amber/30 shadow-[0_1px_0_rgba(255,176,32,0.15)]"
          : "border-white/5"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ── Logo ── */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            onClick={closeMobile}
          >
            {/* Custom Siglat PH SVG Logo */}
            <svg
              className="w-9 h-9 transition-all duration-150 group-hover:scale-105"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="navBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFD000" />
                  <stop offset="100%" stopColor="#FF9000" />
                </linearGradient>
                <linearGradient id="navRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFE57F" />
                  <stop offset="50%" stopColor="#FFC107" />
                  <stop offset="100%" stopColor="#FF8F00" />
                </linearGradient>
              </defs>
              {/* Outer Ring with Gradient */}
              <path
                d="M 50,14 A 36,36 0 1,0 70,78"
                stroke="url(#navRingGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M 75,35 A 36,36 0 0,0 57,15"
                stroke="url(#navRingGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M 76,58 A 36,36 0 0,0 76.5,50"
                stroke="url(#navRingGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Central Lightning Bolt */}
              <path
                d="M 54,25 L 40,48.5 L 51,48.5 L 47.5,77.5 L 61.5,41.5 L 50,41.5 Z"
                fill="url(#navBoltGrad)"
              />
            </svg>
            <span className="font-bold text-lg tracking-tight text-spark-white">
              Siglat{" "}
              <span className="text-live-amber">PH</span>
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "relative px-4 py-2 text-sm font-medium transition-all duration-150 rounded-lg",
                    isActive
                      ? "text-live-amber"
                      : "text-spark-white/60 hover:text-spark-white hover:bg-white/5"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0.5 left-4 right-4 h-px bg-live-amber rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* ── Desktop CTA ── */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setShowSubscribeModal(true)}
              className="p-2 rounded-xl text-spark-white/60 hover:text-live-amber hover:bg-white/5
                         transition-all duration-150 relative group"
              title="SMS Outage Alerts"
            >
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-live-amber rounded-full
                              border-2 border-grid-ink animate-pulse" />
            </button>
            <Link
              to="/reports?action=new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fault-red text-white text-sm font-semibold
                         transition-all duration-150 hover:brightness-110 active:scale-95"
            >
              <AlertTriangle size={14} />
              Report Outage
            </Link>
          </div>

          {/* ── Mobile Toggle ── */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-spark-white/70 hover:bg-white/10 transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 pb-4 animate-slide-down">
            <div className="flex flex-col gap-1 pt-3">
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    clsx(
                      "px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150",
                      isActive
                        ? "text-live-amber bg-live-amber/10"
                        : "text-spark-white/70 hover:text-spark-white hover:bg-white/5"
                    )
                  }
                >
                  {label}
                </NavLink>
              ))}
              <div className="pt-3 border-t border-white/5 mt-2 flex flex-col gap-2">
                <button
                  onClick={() => { closeMobile(); setShowSubscribeModal(true); }}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl
                             border border-live-amber/30 text-live-amber
                             text-sm font-semibold transition-all duration-150 hover:bg-live-amber/10"
                >
                  <Bell size={14} />
                  SMS Outage Alerts
                </button>
                <Link
                  to="/reports?action=new"
                  onClick={closeMobile}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-fault-red text-white
                             text-sm font-semibold transition-all duration-150 hover:brightness-110"
                >
                  <AlertTriangle size={14} />
                  Report Outage
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>

    <SubscribeModal
      isOpen={showSubscribeModal}
      onClose={() => setShowSubscribeModal(false)}
    />
    </>
  );
}
