import { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { Zap, Menu, X, AlertTriangle } from "lucide-react";
import clsx from "clsx";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/map", label: "Live Map" },
  { to: "/reports", label: "Reports" },
  { to: "/statistics", label: "Statistics" },
  { to: "/about", label: "About" },
];

/**
 * Main application Navbar.
 * - Sticky with blur backdrop on scroll
 * - Active route highlighting via React Router NavLink
 * - Responsive hamburger menu for mobile
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Add shadow on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  const closeMobile = () => setMobileOpen(false);

  return (
    <header
      className={clsx(
        "sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border transition-shadow duration-200",
        scrolled && "shadow-soft"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ── Logo ── */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
            onClick={closeMobile}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-white shadow-glow group-hover:scale-105 transition-transform">
              <Zap size={18} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg text-slate-800 tracking-tight">
              Siglat{" "}
              <span className="text-primary">PH</span>
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-slate-600 hover:text-primary hover:bg-primary/5"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* ── Desktop CTA ── */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/reports?action=new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold
                         transition-all duration-200 hover:bg-primary-dark hover:shadow-glow active:scale-95"
            >
              <AlertTriangle size={14} />
              Report Brownout
            </Link>
          </div>

          {/* ── Mobile Toggle ── */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border pb-4 animate-slide-down">
            <div className="flex flex-col gap-1 pt-3">
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    clsx(
                      "px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-slate-600 hover:text-primary hover:bg-primary/5"
                    )
                  }
                >
                  {label}
                </NavLink>
              ))}
              <div className="pt-3 border-t border-border mt-2">
                <Link
                  to="/reports?action=new"
                  onClick={closeMobile}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-primary text-white
                             text-sm font-semibold transition-all duration-200 hover:bg-primary-dark"
                >
                  <AlertTriangle size={14} />
                  Report Brownout
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
