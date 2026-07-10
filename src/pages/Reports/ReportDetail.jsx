import { useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, FileText, AlertTriangle } from "lucide-react";
import { MapContainer as LeafletMap, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import ReportTimeline from "../../components/reports/ReportTimeline";
import ConfirmButton from "../../components/reports/ConfirmButton";
import Loading from "../../components/common/Loading";
import { useReports } from "../../hooks/useReports";
import { formatDate, getStatusConfig } from "../../utils";

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reports, loading, updateReport } = useReports();

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
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft size={15} />
            Back
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge status={report.status} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">{report.barangay}</h1>
              <p className="text-muted flex items-center gap-1.5 mt-1">
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
              <div style={{ height: "280px" }}>
                <LeafletMap
                  center={[report.latitude, report.longitude]}
                  zoom={14}
                  className="w-full h-full"
                  zoomControl={false}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CircleMarker
                    center={[report.latitude, report.longitude]}
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
                </LeafletMap>
              </div>
            </Card>

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
                ].map(({ label, value }) => (
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
    </div>
  );
}
