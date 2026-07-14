import { useState, useMemo } from "react";
import {
  Zap, Plus, Filter, ArrowUpDown, CheckCircle2,
  Search, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import Modal from "../../components/common/Modal";
import Loading from "../../components/common/Loading";
import ReportCard from "../../components/reports/ReportCard";
import ReportForm from "../../components/reports/ReportForm";
import { useReports } from "../../hooks/useReports";

const PAGE_SIZE = 6;

const STATUS_FILTERS = ["All", "Ongoing", "Scheduled", "Restored"];
const SORT_OPTIONS = [
  { value: "newest",        label: "Newest First" },
  { value: "oldest",        label: "Oldest First" },
  { value: "most-confirmed", label: "Most Confirmed" },
];

export default function Reports() {
  const { reports, loading, addReport, updateReport } = useReports();

  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy,        setSortBy]       = useState("newest");
  const [searchQuery,   setSearchQuery]  = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [page,          setPage]         = useState(1);
  const [formOpen,      setFormOpen]     = useState(false);
  const [successReport, setSuccessReport] = useState(null);

  /* ── Unique location groups for the dropdown ── */
  const locationOptions = useMemo(() => {
    const seen = new Set();
    const opts = [{ value: "All", label: "All Locations" }];
    reports.forEach((r) => {
      const key = `${r.municipality}, ${r.province}`;
      if (!seen.has(key)) {
        seen.add(key);
        opts.push({ value: key, label: key });
      }
    });
    return opts;
  }, [reports]);

  /* ── Full filter + sort pipeline ── */
  const processedReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = reports.filter((r) => {
      // Status filter
      const statusOk =
        statusFilter === "All" || r.status === statusFilter.toLowerCase();

      // Location dropdown filter
      const locationKey = `${r.municipality}, ${r.province}`;
      const locationOk =
        locationFilter === "All" || locationKey === locationFilter;

      // Full-text search across key fields
      const searchOk =
        !q ||
        [r.barangay, r.municipality, r.province, r.reason, r.notes]
          .some((f) => f?.toLowerCase().includes(q));

      return statusOk && locationOk && searchOk;
    });

    if (sortBy === "newest") {
      list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "oldest") {
      list = [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === "most-confirmed") {
      list = [...list].sort((a, b) => b.confirmations - a.confirmations);
    }

    return list;
  }, [reports, statusFilter, locationFilter, sortBy, searchQuery]);

  /* ── Pagination slice ── */
  const totalPages  = Math.max(1, Math.ceil(processedReports.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const pageStart   = (safePage - 1) * PAGE_SIZE;
  const pageReports = processedReports.slice(pageStart, pageStart + PAGE_SIZE);

  /* ── Reset page when filters change ── */
  const applyStatus   = (v) => { setStatusFilter(v);   setPage(1); };
  const applyLocation = (v) => { setLocationFilter(v); setPage(1); };
  const applySort     = (v) => { setSortBy(v);          setPage(1); };
  const applySearch   = (v) => { setSearchQuery(v);     setPage(1); };
  const clearSearch   = ()  => { setSearchQuery("");     setPage(1); };

  const handleFormSuccess = (newReport) => {
    addReport(newReport);
    setFormOpen(false);
    setSuccessReport(newReport);
    setTimeout(() => setSuccessReport(null), 5000);
  };

  /* ── Status pill active style ── */
  const filterActiveStyle = (f) => {
    if (f === "All")       return "bg-spark-white text-grid-ink";
    if (f === "Ongoing")   return "bg-fault-red text-white";
    if (f === "Scheduled") return "bg-live-amber text-grid-ink";
    if (f === "Restored")  return "bg-restored-cyan text-grid-ink";
    return "bg-spark-white text-grid-ink";
  };

  /* ── Pagination range ── */
  const pageRange = () => {
    const range = [];
    const delta = 1;
    const left  = Math.max(1, safePage - delta);
    const right = Math.min(totalPages, safePage + delta);

    if (left > 1)          { range.push(1); if (left > 2) range.push("…"); }
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages) { if (right < totalPages - 1) range.push("…"); range.push(totalPages); }
    return range;
  };

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="bg-grid-ink border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-spark-white flex items-center gap-2">
                <Zap size={22} className="text-live-amber" />
                Outage Reports
              </h1>
              <p className="text-spark-white/40 text-sm mt-1 font-mono">
                {processedReports.length} of {reports.length}{" "}
                {reports.length === 1 ? "report" : "reports"}
              </p>
            </div>
            <button
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-fault-red text-white
                         text-sm font-semibold transition-all duration-150 hover:brightness-110 active:scale-95"
            >
              <Plus size={15} />
              Report Outage
            </button>
          </div>

          {/* ── Search Bar ── */}
          <div className="mt-5 relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-spark-white/30 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => applySearch(e.target.value)}
              placeholder="Search by barangay, municipality, province, reason…"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm font-medium
                         bg-white/5 border border-white/10 text-spark-white
                         placeholder-spark-white/30
                         focus:outline-none focus:border-live-amber/60 transition-all duration-150"
              style={{ caretColor: "#FFB020" }}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-spark-white/40
                           hover:text-spark-white transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* ── Filters Row ── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">
            {/* Status pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={14} className="text-spark-white/30 flex-shrink-0" />
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => applyStatus(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                    statusFilter === f
                      ? filterActiveStyle(f)
                      : "bg-white/5 text-spark-white/50 hover:bg-white/10 hover:text-spark-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Location + Sort */}
            <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
              {/* Location dropdown */}
              <select
                value={locationFilter}
                onChange={(e) => applyLocation(e.target.value)}
                className="text-xs font-semibold border border-white/10 rounded-lg px-3 py-1.5
                           bg-white/5 text-spark-white focus:outline-none transition-colors cursor-pointer"
                style={{ maxWidth: "200px" }}
              >
                {locationOptions.map(({ value, label }) => (
                  <option key={value} value={value} className="bg-[#0B0F14] text-white">
                    {label}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-spark-white/30 flex-shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => applySort(e.target.value)}
                  className="text-xs font-semibold border border-white/10 rounded-lg px-3 py-1.5
                             bg-white/5 text-spark-white focus:outline-none transition-colors cursor-pointer"
                >
                  {SORT_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value} className="bg-[#0B0F14] text-white">
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Success Toast ── */}
      {successReport && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-slide-down"
            style={{
              background: "rgba(45,212,191,0.08)",
              border: "1px solid rgba(45,212,191,0.25)",
              color: "#2DD4BF",
            }}
          >
            <CheckCircle2 size={18} />
            Report submitted!{" "}
            <span className="font-semibold">
              {successReport.barangay}, {successReport.municipality}
            </span>{" "}
            is now on the grid.
          </div>
        </div>
      )}

      {/* ── Report Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <Loading size="page" message="Reading grid data..." />
        ) : processedReports.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <Zap size={40} className="mx-auto mb-3 opacity-20 text-live-amber" />
            <p className="font-medium text-slate-700">
              {searchQuery
                ? `No reports match "${searchQuery}"`
                : statusFilter !== "All"
                ? `No ${statusFilter.toLowerCase()} outages found.`
                : "No reports yet — grid looks stable."}
            </p>
            <p className="text-sm mt-1 text-muted">
              {searchQuery ? "Try a different search term or clear the filter." : "Try a different filter or be the first to report."}
            </p>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
                           text-live-amber border hover:bg-live-amber/10 transition-all duration-150"
                style={{ borderColor: "rgba(255,176,32,0.3)" }}
              >
                <X size={13} /> Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onUpdate={(id, updated) => updateReport(id, updated)}
                />
              ))}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-10 pt-6 border-t border-circuit-light">
                {/* Result info */}
                <p className="text-xs text-muted font-mono hidden sm:block">
                  Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, processedReports.length)}{" "}
                  of {processedReports.length}
                </p>

                {/* Page controls */}
                <div className="flex items-center gap-1 mx-auto sm:mx-0">
                  {/* Prev */}
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-150
                               disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      borderColor: "rgba(226,232,240,0.8)",
                      color: "#64748B",
                    }}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {/* Page numbers */}
                  {pageRange().map((p, i) =>
                    p === "…" ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="w-8 h-8 flex items-center justify-center text-xs text-muted"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold
                                   font-mono transition-all duration-150"
                        style={
                          p === safePage
                            ? {
                                background: "#FFB020",
                                color: "#0B0F14",
                                fontWeight: 700,
                              }
                            : {
                                border: "1px solid rgba(226,232,240,0.8)",
                                color: "#64748B",
                              }
                        }
                        aria-current={p === safePage ? "page" : undefined}
                      >
                        {p}
                      </button>
                    )
                  )}

                  {/* Next */}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-150
                               disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      borderColor: "rgba(226,232,240,0.8)",
                      color: "#64748B",
                    }}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Report Form Modal ── */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title="Report a Brownout"
        size="lg"
      >
        <ReportForm
          onSuccess={handleFormSuccess}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
