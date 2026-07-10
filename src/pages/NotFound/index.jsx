import { Link } from "react-router-dom";
import { Zap, Home, Map, FileText } from "lucide-react";

/**
 * 404 Not Found page.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-fade-in">
      {/* Icon */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Zap size={42} className="text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-danger flex items-center justify-center text-white text-xs font-bold">
          !
        </div>
      </div>

      <h1 className="text-6xl font-extrabold text-slate-800 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-slate-700 mb-3">Page Not Found</h2>
      <p className="text-muted text-sm text-center max-w-sm mb-8 leading-relaxed">
        Looks like this page had its power cut. Let's get you back to a working area.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold
                     text-sm transition-all duration-200 hover:bg-primary-dark active:scale-95"
        >
          <Home size={15} />
          Go Home
        </Link>
        <Link
          to="/map"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-primary text-primary font-semibold
                     text-sm transition-all duration-200 hover:bg-primary hover:text-white active:scale-95"
        >
          <Map size={15} />
          Live Map
        </Link>
        <Link
          to="/reports"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold
                     text-sm transition-all duration-200 hover:bg-slate-200 active:scale-95"
        >
          <FileText size={15} />
          Reports
        </Link>
      </div>
    </div>
  );
}
