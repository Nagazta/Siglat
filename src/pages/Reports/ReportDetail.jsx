import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, FileText, AlertTriangle, Edit, CheckCircle2 } from "lucide-react";
import { MapContainer as LeafletMap, TileLayer, CircleMarker, Popup, useMapEvents } from "react-leaflet";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import SourceTag from "../../components/common/SourceTag";
import ReportTimeline from "../../components/reports/ReportTimeline";
import ConfirmButton from "../../components/reports/ConfirmButton";
import Loading from "../../components/common/Loading";
import { useReports } from "../../hooks/useReports";
import { formatDate, getStatusConfig } from "../../utils";
import { updateReportLocation } from "../../services/firebase/firestore";

function MapEvents({ onClick }) {
  useMapEvents({
    click: onClick,
  });
  return null;
}

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reports, loading, updateReport } = useReports();

  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempCoords, setTempCoords] = useState(null);
  const [passcode, setPasscode] = useState("");
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [toast, setToast] = useState(null);

  const triggerToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleSaveClick = () => {
    if (!tempCoords) return;
    setShowPasscodeModal(true);
  };

  const handleConfirmSave = async () => {
    const expectedPasscode = import.meta.env.VITE_ADMIN_PASSCODE || "admin123";
    if (passcode !== expectedPasscode) {
      triggerToast("error", "Access Denied: Incorrect admin passcode!");
      setShowPasscodeModal(false);
      setPasscode("");
      return;
    }

    setSavingLocation(true);
    try {
      await updateReportLocation(id, tempCoords.lat, tempCoords.lng);
      setIsEditingLocation(false);
      setShowPasscodeModal(false);
      setPasscode("");
      triggerToast("success", "Coordinates overridden successfully!");
    } catch (err) {
      console.error(err);
      triggerToast("error", "System Error: Failed to write coordinates.");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleMapClick = (e) => {
    if (!isEditingLocation) return;
    setTempCoords({
      lat: e.latlng.lat,
      lng: e.latlng.lng
    });
  };

  const report = useMemo(
    () => reports.find((r) => r.id === id) || null,
    [reports, id]
  );

  const handleConfirmUpdate = (updated) => {
    updateReport(id, updated);
  };

  if (loading) return <Loading size="page" message="Loading report..." />;

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <AlertTriangle size={40} className="text-muted opacity-40" />
        <div className="text-center">
          <p className="font-semibold text-slate-700">Report not found.</p>
          <p className="text-sm text-muted mt-1">It may have been removed or the link is incorrect.</p>
        </div>
        <Link
          to="/reports"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all"
        >
          <ArrowLeft size={14} />
          Back to Reports
        </Link>
      </div>
    );
  }

  const config = getStatusConfig(report.status);

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <div className="bg-grid-ink border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm transition-colors mb-4"
            style={{ color: "rgba(248,250,252,0.6)" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#FFB020"}
            onMouseLeave={(e) => e.currentTarget.style.color = "rgba(248,250,252,0.6)"}
          >
            <ArrowLeft size={15} />
            Back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge status={report.status} />
                <SourceTag sourceUrl={report.sourceUrl} />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "#F8FAFC" }}>{report.barangay}</h1>
              <p className="flex items-center gap-1.5 mt-1" style={{ color: "rgba(248,250,252,0.6)" }}>
                <MapPin size={14} />
                {report.municipality}, {report.province}
              </p>
            </div>
            <div className="flex-shrink-0">
              <ConfirmButton
                reportId={report.id}
                confirmations={report.confirmations}
                restoredVotes={report.restoredVotes}
                onUpdate={handleConfirmUpdate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column — main info */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Mini map */}
            <Card padding="none" className="overflow-hidden">
              {isEditingLocation && (
                <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                  Edit Mode: Click anywhere on the map to drop a new pin, then click Save.
                </div>
              )}
              <div style={{ height: "300px" }}>
                <LeafletMap
                  center={[parseFloat(report.latitude), parseFloat(report.longitude)]}
                  zoom={14}
                  className="w-full h-full"
                  zoomControl={isEditingLocation}
                  scrollWheelZoom={isEditingLocation}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapEvents onClick={handleMapClick} />
                  
                  {/* Current database coordinates pin */}
                  {!isEditingLocation && (
                    <CircleMarker
                      center={[parseFloat(report.latitude), parseFloat(report.longitude)]}
                      radius={12}
                      pathOptions={{
                        color: "#ffffff",
                        weight: 3,
                        fillColor: config.markerColor,
                        fillOpacity: 0.9,
                      }}
                    >
                      <Popup>
                        <span className="text-xs font-semibold">{report.barangay}</span>
                      </Popup>
                    </CircleMarker>
                  )}

                  {/* Temporary drag/click override pin */}
                  {isEditingLocation && tempCoords && (
                    <CircleMarker
                      center={[tempCoords.lat, tempCoords.lng]}
                      radius={12}
                      pathOptions={{
                        color: "#ffffff",
                        weight: 3,
                        fillColor: "#3B82F6", // Blue for editing
                        fillOpacity: 0.9,
                      }}
                    />
                  )}
                </LeafletMap>
              </div>

              {/* Editing controls panel */}
              {isEditingLocation ? (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-[11px] text-slate-500 font-mono">
                    New coordinates: <span className="font-semibold">{tempCoords?.lat.toFixed(5)}, {tempCoords?.lng.toFixed(5)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditingLocation(false);
                        setPasscode("");
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveClick}
                      disabled={savingLocation || !tempCoords}
                      className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark disabled:opacity-50 text-xs font-semibold text-white transition-all"
                    >
                      Save Location
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      setTempCoords({ lat: parseFloat(report.latitude), lng: parseFloat(report.longitude) });
                      setIsEditingLocation(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-primary/10 hover:text-primary rounded-lg transition-all"
                  >
                    <Edit size={12} />
                    Override Location Coordinates
                  </button>
                </div>
              )}
            </Card>

            {/* VECO Map Image overlay */}
            {report.mapImageUrl && (() => {
              const highResMapUrl = report.mapImageUrl.includes("wixstatic.com/media/")
                ? report.mapImageUrl.split("/v1/fill/")[0]
                : report.mapImageUrl;

              return (
                <Card className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <MapPin size={15} className="text-amber-500" />
                      Official Outage Area Map
                    </h2>
                    <a
                      href={highResMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View Original
                    </a>
                  </div>
                  <div className="relative group">
                    <a
                      href={highResMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex justify-center p-2.5 hover:opacity-95 transition-all cursor-zoom-in block"
                    >
                      <img
                        src={highResMapUrl}
                        alt="Visayan Electric Outage Map"
                        className="max-w-full max-h-96 object-contain rounded-lg shadow-sm"
                      />
                    </a>
                    <p className="text-[11px] text-slate-400 mt-2 text-center">
                      💡 Click map image to view in full resolution
                    </p>
                  </div>
                </Card>
              );
            })()}

            {/* Notes */}
            {report.notes && (
              <Card>
                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                  <FileText size={15} className="text-primary" />
                  Reporter Notes
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">{report.notes}</p>
              </Card>
            )}

            {/* Details grid */}
            <Card>
              <h2 className="text-sm font-bold text-slate-700 mb-4">Outage Details</h2>
              <dl className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Status", value: <Badge status={report.status} /> },
                  { label: "Reason", value: report.reason || "Unknown" },
                  {
                    label: "Started",
                    value: <span className="flex items-center gap-1.5"><Clock size={13} />{formatDate(report.startTime)}</span>,
                  },
                  {
                    label: "Est. Restoration",
                    value: report.estimatedEnd ? formatDate(report.estimatedEnd) : "Not specified",
                  },
                  {
                    label: "Coordinates",
                    value: `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`,
                  },
                  {
                    label: "Last Updated",
                    value: formatDate(report.updatedAt),
                  },
                  report.sourceUrl ? {
                    label: "Source Reference",
                    value: (
                      <a
                        href={report.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-semibold"
                      >
                        Visayan Electric Advisory ↗
                      </a>
                    ),
                  } : null,
                ].filter(Boolean).map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                      {label}
                    </dt>
                    <dd className="text-sm text-slate-700 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          {/* Right column — timeline + community */}
          <div className="flex flex-col gap-6">
            {/* Community votes */}
            <Card>
              <h2 className="text-sm font-bold text-slate-700 mb-4">Community Votes</h2>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Still no power</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-danger/20 flex-1 w-20">
                      <div
                        className="h-2 rounded-full bg-danger transition-all"
                        style={{
                          width: `${Math.min(100, (report.confirmations / Math.max(report.confirmations + report.restoredVotes, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-danger w-6 text-right">
                      {report.confirmations}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Already restored</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-success/20 flex-1 w-20">
                      <div
                        className="h-2 rounded-full bg-success transition-all"
                        style={{
                          width: `${Math.min(100, (report.restoredVotes / Math.max(report.confirmations + report.restoredVotes, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-success w-6 text-right">
                      {report.restoredVotes}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted mb-3">Cast your vote:</p>
                <ConfirmButton
                  reportId={report.id}
                  confirmations={report.confirmations}
                  restoredVotes={report.restoredVotes}
                  onUpdate={handleConfirmUpdate}
                />
              </div>
            </Card>

            {/* Timeline */}
            <Card>
              <h2 className="text-sm font-bold text-slate-700 mb-4">Timeline</h2>
              <ReportTimeline report={report} />
            </Card>

            {/* Back link */}
            <Link
              to="/reports"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                         border-2 border-border text-slate-600 text-sm font-semibold
                         hover:border-primary hover:text-primary transition-all duration-200"
            >
              <ArrowLeft size={14} />
              All Reports
            </Link>
          </div>
        </div>
      </div>

      {/* ── Passcode Authorization Modal ── */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 animate-scale-in">
            <h3 className="font-bold text-slate-800 text-lg mb-2 flex items-center gap-2">
              <Edit size={18} className="text-primary" />
              Authorize Action
            </h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Please enter the Admin Passcode to authorize this coordinate override:
            </p>
            <input
              type="password"
              placeholder="Admin Passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 focus:border-primary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4 transition-all"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && passcode) handleConfirmSave();
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPasscodeModal(false);
                  setPasscode("");
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={!passcode || savingLocation}
                className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 rounded-xl transition-all"
              >
                {savingLocation ? "Saving..." : "Verify & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Toast Overlay ── */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] animate-slide-in">
          <div className={`flex items-center gap-3 px-4 py-3.5 border rounded-xl shadow-lg text-sm font-semibold max-w-md ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
            {toast.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-rose-500 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
