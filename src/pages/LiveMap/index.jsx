import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, MapPin, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import MapContainer from "../../components/map/MapContainer";
import Badge from "../../components/common/Badge";
import Loading from "../../components/common/Loading";
import { useReports } from "../../hooks/useReports";
import { useMap } from "../../hooks/useMap";
import { timeAgo } from "../../utils";
import { STATUS } from "../../data/mockData";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: STATUS.ONGOING, label: "Ongoing" },
  { value: STATUS.SCHEDULED, label: "Scheduled" },
  { value: STATUS.RESTORED, label: "Restored" },
];

export default function LiveMap() {
  const { reports, loading } = useReports();
  const { flyTo, flyToReport, flyToLocation } = useMap();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  // Filter reports for sidebar list
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.province.toLowerCase().includes(q) ||
        r.municipality.toLowerCase().includes(q) ||
        r.barangay.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [reports, statusFilter, search]);

  const handleMarkerClick = (report) => {
    setSelectedId(report.id);
  };

  const handleSidebarItemClick = (report) => {
    setSelectedId(report.id);
    flyToLocation(report.latitude, report.longitude, 14);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {/* ── Page header bar ── */}
      <div className="bg-white border-b border-border flex-shrink-0">
        <div className="max-w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <h1 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <MapPin size={18} className="text-primary" />
            Live Outage Map
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                         bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-all"
            >
              <SlidersHorizontal size={13} />
              {sidebarOpen ? "Hide" : "Show"} Sidebar
            </button>
            <Link
              to="/reports?action=new"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                         bg-primary text-white hover:bg-primary-dark transition-all"
            >
              <AlertTriangle size={13} />
              Report
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main layout: sidebar + map ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-80 flex-shrink-0 bg-white border-r border-border flex flex-col overflow-hidden">
            {/* Search + filter */}
            <div className="p-3 border-b border-border flex flex-col gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search province, city, barangay..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border
                             focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                             transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status pills */}
              <div className="flex gap-1 flex-wrap">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all
                      ${statusFilter === f.value
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-primary/10 hover:text-primary"
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
                  <Loading size="md" message="Loading reports..." />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="py-10 text-center text-muted text-sm">
                  <MapPin size={28} className="mx-auto mb-2 opacity-30" />
                  No reports found
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredReports.map((report) => (
                    <li key={report.id}>
                      <button
                        onClick={() => handleSidebarItemClick(report)}
                        className={`w-full text-left px-4 py-3 transition-all hover:bg-primary/5
                          ${selectedId === report.id ? "bg-primary/8 border-l-2 border-primary" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <Badge status={report.status} size="sm" />
                          <span className="text-[10px] text-muted">{timeAgo(report.createdAt)}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                          {report.barangay}
                        </p>
                        <p className="text-xs text-muted">
                          {report.municipality}, {report.province}
                        </p>
                        <p className="text-[11px] text-muted mt-1">
                          👍 {report.confirmations} confirmations
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Sidebar footer */}
            <div className="px-4 py-2.5 border-t border-border bg-slate-50">
              <p className="text-[11px] text-muted">
                Showing {filteredReports.length} of {reports.length} reports
              </p>
            </div>
          </aside>
        )}

        {/* Map */}
        <div className="flex-1 relative p-3">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
              <Loading size="lg" message="Loading map..." />
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
