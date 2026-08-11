import { useState, useMemo, useEffect } from "react";
import {
  Zap, Plus, Filter, ArrowUpDown, CheckCircle2,
  Search, ChevronLeft, ChevronRight, X, Lock, LogOut, Check, Trash2, Key, AlertTriangle
} from "lucide-react";
import Modal from "../../components/common/Modal";
import Loading from "../../components/common/Loading";
import ReportCard from "../../components/reports/ReportCard";
import ReportForm from "../../components/reports/ReportForm";
import { useReports } from "../../hooks/useReports";
import SyncPanel from "../../components/reports/SyncPanel";
import { auth, db } from "../../services/firebase/config";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";

const PAGE_SIZE = 6;

const STATUS_FILTERS = ["All", "Ongoing", "Scheduled", "Restored"];
const SORT_OPTIONS = [
  { value: "newest",        label: "Newest First" },
  { value: "oldest",        label: "Oldest First" },
  { value: "most-confirmed", label: "Most Confirmed" },
];

export default function Reports() {
  const { reports, loading, addReport, updateReport, removeReport } = useReports();

  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy,        setSortBy]       = useState("newest");
  const [searchQuery,   searchQuerySet]  = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [page,          setPage]         = useState(1);
  const [formOpen,      setFormOpen]     = useState(false);
  const [successReport, setSuccessReport] = useState(null);

  // Admin state
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  
  // Pending queue pagination state
  const [pendingPage, setPendingPage] = useState(1);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Listen to Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setAdminUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Login failed:", err);
      setLoginError("Invalid credentials. Please verify admin email and password.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  // Moderation modal states
  const [selectedReport, setSelectedReport] = useState(null);
  const [moderationType, setModerationType] = useState(null); // 'approve' | 'reject'
  
  // Moderation form fields
  const [modStatus, setModStatus] = useState("ongoing");
  const [modReason, setModReason] = useState("");
  const [modEstEnd, setModEstEnd] = useState("");
  const [modNotes, setModNotes] = useState("");

  const openApproveModal = (report) => {
    setSelectedReport(report);
    setModerationType("approve");
    setModStatus(report.reportedStatus || "ongoing");
    setModReason(report.reason || "");
    setModEstEnd(report.estimatedEnd || "");
    setModNotes(report.notes || "");
  };

  const openRejectModal = (report) => {
    setSelectedReport(report);
    setModerationType("reject");
  };

  const handleApproveConfirm = async () => {
    if (!selectedReport) return;
    try {
      const docRef = doc(db, "reports", selectedReport.id);
      await updateDoc(docRef, {
        status: modStatus,
        reason: modReason,
        estimatedEnd: modEstEnd || null,
        notes: modNotes,
        updatedAt: new Date().toISOString(),
      });
      updateReport(selectedReport.id, {
        status: modStatus,
        reason: modReason,
        estimatedEnd: modEstEnd || null,
        notes: modNotes,
      });
      setSelectedReport(null);
      setModerationType(null);
    } catch (err) {
      console.error("Failed to approve report:", err);
      alert("Verification Failed: " + err.message);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedReport) return;
    try {
      const docRef = doc(db, "reports", selectedReport.id);
      await deleteDoc(docRef);
      removeReport(selectedReport.id);
      setSelectedReport(null);
      setModerationType(null);
    } catch (err) {
      console.error("Failed to delete report:", err);
      alert("Rejection Failed: " + err.message);
    }
  };

  // Wrapper function for compatibility
  const setSearchQuery = (val) => {
    searchQuerySet(val);
  };

  // Exclude pending reports from standard list
  const activeReports = useMemo(() => reports.filter((r) => r.status !== "pending"), [reports]);
  
  // Pending reports list
  const pendingReports = useMemo(() => reports.filter((r) => r.status === "pending"), [reports]);

  const PENDING_PAGE_SIZE = 6;
  const totalPendingPages = Math.max(1, Math.ceil(pendingReports.length / PENDING_PAGE_SIZE));
  const safePendingPage = Math.min(pendingPage, totalPendingPages);
  const pendingStart = (safePendingPage - 1) * PENDING_PAGE_SIZE;
  const pagePendingReports = useMemo(() => {
    return pendingReports.slice(pendingStart, pendingStart + PENDING_PAGE_SIZE);
  }, [pendingReports, pendingStart]);

  /* ── Unique location groups for the dropdown ── */
  const locationOptions = useMemo(() => {
    const seen = new Set();
    const opts = [{ value: "All", label: "All Locations" }];
    activeReports.forEach((r) => {
      const key = `${r.municipality}, ${r.province}`;
      if (!seen.has(key)) {
        seen.add(key);
        opts.push({ value: key, label: key });
      }
    });
    return opts;
  }, [activeReports]);

  /* ── Full filter + sort pipeline ── */
  const processedReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = activeReports.filter((r) => {
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
                {processedReports.length} of {activeReports.length}{" "}
                {activeReports.length === 1 ? "report" : "reports"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAdminPanelOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95 ${
                  adminPanelOpen
                    ? "bg-live-amber text-grid-ink hover:brightness-105"
                    : "border border-white/10 text-spark-white/70 hover:text-spark-white hover:bg-white/5"
                }`}
              >
                <Lock size={14} />
                {adminPanelOpen ? "View Map Data" : "Admin Panel"}
              </button>
              <button
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-fault-red text-white
                           text-sm font-semibold transition-all duration-150 hover:brightness-110 active:scale-95"
              >
                <Plus size={15} />
                Report Outage
              </button>
            </div>
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

      {/* ── Moderation Queue / Standard Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {adminPanelOpen ? (
          /* Admin Moderation Queue */
          !adminUser ? (
            /* Log in Card */
            <div className="max-w-md mx-auto bg-[#1E293B] border border-white/5 rounded-2xl p-6 shadow-xl mt-8">
              <h2 className="text-lg font-bold text-spark-white flex items-center gap-2 mb-4">
                <Lock size={18} className="text-live-amber" />
                Administrator Access
              </h2>
              <p className="text-xs text-spark-white/60 mb-4 leading-relaxed">
                Please enter your administrator credentials to access the pending reports moderation queue.
              </p>
              
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-spark-white/60 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@siglat.ph"
                    required
                    className="w-full px-3 py-2 bg-[#0B0F14]/40 border border-white/10 rounded-xl text-sm text-spark-white placeholder-spark-white/30 focus:outline-none focus:border-live-amber/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-spark-white/60 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3 py-2 bg-[#0B0F14]/40 border border-white/10 rounded-xl text-sm text-spark-white placeholder-spark-white/30 focus:outline-none focus:border-live-amber/60"
                  />
                </div>
                {loginError && (
                  <p className="text-xs text-danger font-medium bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                    {loginError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-live-amber text-grid-ink text-sm font-semibold transition-all duration-150 active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: "#FFB020", color: "#0B0F14" }}
                >
                  {loginLoading ? "Verifying..." : "Log In"}
                </button>
              </form>
            </div>
          ) : (
            /* Moderation Dashboard */
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-slate-900 via-grid-ink to-slate-900 border border-white/10 rounded-2xl shadow-lg gap-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <p className="text-[10px] text-spark-white/40 font-mono uppercase tracking-wider">System Auditing Session Active</p>
                    <p className="text-sm font-bold text-spark-white mt-0.5">{adminUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 active:scale-95 transition-all"
                >
                  <LogOut size={13} />
                  Sign Out Session
                </button>
              </div>

              <div>
                <h2 className="text-lg font-bold text-spark-white mb-2">Pending Community Reports</h2>
                <p className="text-xs text-spark-white/60 mb-4 font-mono">
                  Review and moderate outage reports submitted by the community. Approved reports appear instantly on the live map and public feed.
                </p>

                {pendingReports.length === 0 ? (
                  <div className="text-center py-20 bg-gradient-to-r from-slate-900 via-grid-ink to-slate-900 border border-white/10 rounded-2xl shadow-lg flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-4">
                      <CheckCircle2 size={24} className="text-emerald-400" />
                    </div>
                    <p className="text-base font-bold text-spark-white">Outage Queue Clear</p>
                    <p className="text-xs text-spark-white/50 mt-1 font-mono max-w-xs">No pending community reports require administrative review at this time.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pagePendingReports.map((report) => (
                        <div key={report.id} className="bg-[#1E293B] border border-white/5 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between">
                          {/* Header details */}
                          <div className="p-4 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300">
                                PENDING
                              </span>
                              {report.reportedStatus && (
                                <span className="text-[10px] text-spark-white/50 font-mono">
                                  Requested: {report.reportedStatus.toUpperCase()}
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-base text-spark-white leading-tight mt-1">
                              {report.barangay}
                            </h3>
                            <p className="text-xs text-spark-white/60">
                              {report.municipality}, {report.province}
                            </p>

                            {report.reason && (
                              <p className="text-xs mt-1 text-spark-white/80 font-medium">
                                Reason: <span className="font-normal text-spark-white/60">{report.reason}</span>
                              </p>
                            )}

                            {report.notes && (
                              <p className="text-xs bg-[#0B0F14]/40 p-2.5 rounded-lg border border-white/5 text-spark-white/60 italic leading-relaxed mt-2">
                                "{report.notes}"
                              </p>
                            )}

                            {report.photoUrl && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-white/5 max-h-36">
                                <img src={report.photoUrl} alt="Attached outage proof" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>

                          {/* Moderation Controls */}
                          <div className="p-3 bg-slate-800/30 border-t border-white/5 flex gap-2 mt-auto">
                            <button
                              onClick={() => openRejectModal(report)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border border-rose-500/30 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 size={13} />
                              Reject
                            </button>
                            <button
                              onClick={() => openApproveModal(report)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-grid-ink hover:brightness-105 transition-colors"
                              style={{ backgroundColor: "#10B981", color: "#0B0F14" }}
                            >
                              <Check size={13} />
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── Pending Pagination ── */}
                    {totalPendingPages > 1 && (
                      <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/5">
                        <p className="text-xs text-spark-white/60 font-mono hidden sm:block">
                          Showing {pendingStart + 1}–{Math.min(pendingStart + PENDING_PAGE_SIZE, pendingReports.length)}{" "}
                          of {pendingReports.length} pending
                        </p>

                        <div className="flex items-center gap-1 mx-auto sm:mx-0">
                          {/* Prev */}
                          <button
                            onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                            disabled={safePendingPage === 1}
                            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 text-spark-white/70 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-all"
                            aria-label="Previous page"
                          >
                            <ChevronLeft size={16} />
                          </button>

                          {/* Page numbers */}
                          {Array.from({ length: totalPendingPages }, (_, idx) => idx + 1).map((p) => (
                            <button
                              key={p}
                              onClick={() => setPendingPage(p)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold font-mono transition-all"
                              style={
                                p === safePendingPage
                                  ? {
                                      background: "#FFB020",
                                      color: "#0B0F14",
                                      fontWeight: 700,
                                    }
                                  : {
                                      border: "1px solid rgba(255,255,255,0.1)",
                                      color: "rgba(248,250,252,0.6)",
                                    }
                              }
                            >
                              {p}
                            </button>
                          ))}

                          {/* Next */}
                          <button
                            onClick={() => setPendingPage((p) => Math.min(totalPendingPages, p + 1))}
                            disabled={safePendingPage === totalPendingPages}
                            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 text-spark-white/70 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-all"
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
            </div>
          )
        ) : (
          <>
            <SyncPanel />

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

      {/* ── Moderation Action Modal (Verify / Reject) ── */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => { setSelectedReport(null); setModerationType(null); }}
        title={moderationType === "approve" ? "Verify & Approve Report" : "Confirm Report Rejection"}
        size="md"
      >
        {moderationType === "approve" ? (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Location</h4>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedReport?.barangay}</p>
              <p className="text-xs text-slate-500">{selectedReport?.municipality}, {selectedReport?.province}</p>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Set Grid Status</label>
                <select
                  value={modStatus}
                  onChange={(e) => setModStatus(e.target.value)}
                  className="w-full text-sm font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-primary cursor-pointer text-slate-800"
                >
                  <option value="ongoing">⚡ Ongoing (Active Outage)</option>
                  <option value="scheduled">📅 Scheduled (Maintenance)</option>
                  <option value="restored">✅ Restored (Resolved)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Outage Reason</label>
                <select
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  className="w-full text-sm font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-primary cursor-pointer text-slate-800"
                >
                  <option value="">Choose a reason...</option>
                  <option value="Transformer maintenance">Transformer maintenance</option>
                  <option value="Line maintenance">Line maintenance</option>
                  <option value="System upgrade">System upgrade</option>
                  <option value="Typhoon damage">Typhoon damage</option>
                  <option value="Equipment failure">Equipment failure</option>
                  <option value="Unknown">Unknown</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimated Restoration <span className="text-muted font-normal text-[11px]">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={modEstEnd}
                  onChange={(e) => setModEstEnd(e.target.value)}
                  className="w-full text-sm font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-primary text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Notes <span className="text-muted font-normal text-[11px]">(optional)</span>
                </label>
                <textarea
                  value={modNotes}
                  onChange={(e) => setModNotes(e.target.value)}
                  placeholder="Notes shown publicly on card details..."
                  rows={2}
                  className="w-full text-sm font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-primary resize-none text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setModerationType(null); }}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-50 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveConfirm}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm transition-all"
                style={{ backgroundColor: "#10B981" }}
              >
                Approve & Publish
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800">
              <AlertTriangle size={20} className="flex-shrink-0 mt-0.5 text-rose-600" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Warning</h4>
                <p className="text-xs mt-0.5 leading-relaxed">
                  You are rejecting and deleting the community report for <strong>{selectedReport?.barangay}</strong>. This will permanently remove it from the system. This action is irreversible.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setModerationType(null); }}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-50 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all"
                style={{ backgroundColor: "#E11D48" }}
              >
                Reject & Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
