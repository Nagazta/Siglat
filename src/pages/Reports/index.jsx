import { useState, useMemo } from "react";
import { FileText, Plus, Filter, ArrowUpDown, CheckCircle2 } from "lucide-react";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Loading from "../../components/common/Loading";
import ReportCard from "../../components/reports/ReportCard";
import ReportForm from "../../components/reports/ReportForm";
import { useReports } from "../../hooks/useReports";

const STATUS_FILTERS = ["All", "Ongoing", "Scheduled", "Restored"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "most-confirmed", label: "Most Confirmed" },
];

export default function Reports() {
  const { reports, loading, addReport, updateReport } = useReports();

  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [formOpen, setFormOpen] = useState(false);
  const [successReport, setSuccessReport] = useState(null);

  const processedReports = useMemo(() => {
    let list = reports.filter((r) => {
      if (statusFilter === "All") return true;
      return r.status === statusFilter.toLowerCase();
    });

    if (sortBy === "newest") {
      list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "oldest") {
      list = [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === "most-confirmed") {
      list = [...list].sort((a, b) => b.confirmations - a.confirmations);
    }

    return list;
  }, [reports, statusFilter, sortBy]);

  const handleFormSuccess = (newReport) => {
    addReport(newReport);
    setFormOpen(false);
    setSuccessReport(newReport);
    setTimeout(() => setSuccessReport(null), 5000);
  };

  const handleConfirmUpdate = (reportId, updated) => {
    updateReport(reportId, updated);
  };

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText size={22} className="text-primary" />
                Outage Reports
              </h1>
              <p className="text-muted text-sm mt-1">
                {reports.length} community reports
              </p>
            </div>
            <Button variant="primary" onClick={() => setFormOpen(true)}>
              <Plus size={15} />
              Report Brownout
            </Button>
          </div>

          {/* ── Filters & Sort ── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-5">
            {/* Status pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={14} className="text-muted flex-shrink-0" />
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${statusFilter === f
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary"
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 sm:ml-auto">
              <ArrowUpDown size={14} className="text-muted flex-shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-semibold border border-border rounded-lg px-3 py-1.5 bg-white
                           text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Success Toast ── */}
      {successReport && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-success/10 border border-success/30 rounded-xl text-success text-sm font-medium animate-slide-down">
            <CheckCircle2 size={18} />
            Report submitted! <span className="font-semibold">{successReport.barangay}, {successReport.municipality}</span> is now on the map.
          </div>
        </div>
      )}

      {/* ── Report Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <Loading size="page" message="Loading reports..." />
        ) : processedReports.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No reports found.</p>
            <p className="text-sm mt-1">Try a different filter or be the first to report!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onUpdate={handleConfirmUpdate}
              />
            ))}
          </div>
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
