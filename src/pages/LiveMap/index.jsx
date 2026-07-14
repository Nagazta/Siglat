import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, MapPin, AlertTriangle, ThumbsUp, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import MapContainer from "../../components/map/MapContainer";
import Badge from "../../components/common/Badge";
import SourceTag from "../../components/common/SourceTag";
import Loading from "../../components/common/Loading";
import { useReports } from "../../hooks/useReports";
import { useMap } from "../../hooks/useMap";
import { timeAgo } from "../../utils";
import { STATUS } from "../../data/mockData";

const STATUS_FILTERS = [
  { value: "all",             label: "All" },
  { value: STATUS.ONGOING,   label: "Ongoing" },
  { value: STATUS.SCHEDULED, label: "Scheduled" },
  { value: STATUS.RESTORED,  label: "Restored" },
];

const filterActiveStyle = (value) => {
  if (value === "all")       return "bg-grid-ink text-spark-white";
  if (value === "ongoing")   return "bg-fault-red text-white";
  if (value === "scheduled") return "bg-live-amber text-grid-ink";
  if (value === "restored")  return "bg-restored-cyan text-grid-ink";
  return "bg-grid-ink text-spark-white";
};

export default function LiveMap() {
  const { reports, loading } = useReports();
  const { flyTo, flyToLocation } = useMap();

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [selectedId,   setSelectedId]   = useState(null);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.province?.toLowerCase().includes(q) ||
        r.municipality?.toLowerCase().includes(q) ||
        r.barangay?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [reports, statusFilter, search]);

  const handleMarkerClick  = (report) => setSelectedId(report.id);
  const handleSidebarClick = (report) => {
    setSelectedId(report.id);
    flyToLocation(report.latitude, report.longitude, 14);
  };

  const accentFor = (status) =>
    status === "ongoing" ? "#E8432E" : status === "restored" ? "#2DD4BF" : "#FFB020";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Header — white ── */}
      <div className="bg-white border-b border-border flex-shrink-0">
        <div className="max-w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <h1 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <Zap size={18} className="text-live-amber" />
            Live Outage Map
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                         bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all duration-150"
            >
              <SlidersHorizontal size={13} />
              {sidebarOpen ? "Hide" : "Show"} Sidebar
            </button>
            <Link
              to="/reports?action=new"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                         bg-fault-red text-white hover:brightness-110 transition-all duration-150 active:scale-95"
            >
              <AlertTriangle size={13} />
              Report
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main: sidebar + map ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar — white ── */}
        {sidebarOpen && (
          <aside className="w-72 flex-shrink-0 bg-white border-r border-border flex flex-col overflow-hidden">

            {/* Search + filter */}
            <div className="p-3 border-b border-border flex flex-col gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search province, city, barangay…"
                  className="w-full pl-8 pr-7 py-2 text-xs rounded-lg border border-border
                             bg-white text-slate-700 placeholder-muted
                             transition-all duration-150"
                  style={{ caretColor: "#FFB020" }}
                  onFocus={(e) => { e.target.style.borderColor = "#FFB020"; e.target.style.boxShadow = "0 0 0 2px rgba(255,176,32,0.15)"; }}
                  onBlur={(e)  => { e.target.style.borderColor = ""; e.target.style.boxShadow = ""; }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status pills */}
              <div className="flex gap-1 flex-wrap">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 ${
                      statusFilter === f.value
                        ? filterActiveStyle(f.value)
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Report list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="py-10">
                  <Loading size="md" message="Reading grid data…" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="py-10 text-center text-muted text-sm">
                  <MapPin size={28} className="mx-auto mb-2 opacity-30 text-live-amber" />
                  No reports found
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredReports.map((report) => {
                    const isSelected = selectedId === report.id;
                    const accent = accentFor(report.status);
                    return (
                      <li key={report.id}>
                        <button
                          onClick={() => handleSidebarClick(report)}
                          className="w-full text-left px-4 py-3 transition-all duration-150 hover:bg-slate-50"
                          style={{
                            borderLeft: isSelected ? `2px solid ${accent}` : "2px solid transparent",
                            background: isSelected ? `${accent}08` : undefined,
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1">
                              <Badge status={report.status} size="sm" />
                              <SourceTag sourceUrl={report.sourceUrl} />
                            </div>
                            <span className="text-[10px] text-muted font-mono flex-shrink-0">
                              {timeAgo(report.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 leading-snug">
                            {report.barangay}
                          </p>
                          <p className="text-xs text-muted">
                            {report.municipality}, {report.province}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-[11px] text-muted font-mono">
                            <ThumbsUp size={10} />
                            <span>{report.confirmations} confirmation{report.confirmations !== 1 ? "s" : ""}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border bg-slate-50">
              <p className="text-[11px] text-muted font-mono">
                Showing {filteredReports.length} of {reports.length} reports
              </p>
            </div>
          </aside>
        )}

        {/* ── Map ── */}
        <div className="flex-1 relative p-3 bg-slate-100">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-white rounded-2xl">
              <Loading size="lg" message="Loading map…" />
            </div>
          ) : (
            <MapContainer
              reports={filteredReports}
              onMarkerClick={handleMarkerClick}
              flyTo={flyTo}
              flyToZoom={14}
              className="w-full h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}
