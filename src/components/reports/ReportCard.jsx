import { Link } from "react-router-dom";
import { MapPin, Clock, ArrowRight, FileText } from "lucide-react";
import Card from "../common/Card";
import Badge from "../common/Badge";
import ConfirmButton from "./ConfirmButton";
import SourceTag from "../common/SourceTag";
import { formatDate, timeAgo, truncate, isNew } from "../../utils";

/**
 * Full report card for the Reports listing page.
 * - Left border accent colored by report status
 * - Timestamps in monospace font (meter readout feel)
 * - NEW badge with brownout flicker on entries < 24h old
 *
 * @param {Object}   report   - The report data object
 * @param {Function} onUpdate - Called when confirmation counts change
 */
export default function ReportCard({ report, onUpdate }) {
  const accentColor =
    report.status === "ongoing"   ? "#E8432E"
    : report.status === "restored" ? "#2DD4BF"
    : "#FFB020";

  return (
    <div
      className="bg-white rounded-2xl border border-circuit-light shadow-card flex flex-col gap-4 p-6 h-full
                 border-l-2 transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5"
      style={{ borderLeftColor: accentColor }}
    >
      {/* ── Header: status + time ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge status={report.status} />
          {isNew(report.createdAt) && (
            <span
              className="animate-flicker inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-black tracking-widest uppercase"
              style={{
                background: "linear-gradient(90deg, #78350f 0%, #92400e 50%, #78350f 100%)",
                color: "#fde68a",
                border: "1px solid #fbbf24",
                boxShadow: "0 0 6px #fbbf2466, 0 0 14px #f59e0b33",
              }}
            >
              ⚡ NEW
            </span>
          )}
          <SourceTag sourceUrl={report.sourceUrl} />
        </div>
        <span className="text-xs text-muted flex-shrink-0 font-mono">{timeAgo(report.createdAt)}</span>
      </div>

      {/* ── Location ── */}
      <div className="flex items-start gap-2">
        <MapPin size={15} className="mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
        <div>
          <p className="font-bold text-slate-800 leading-snug">{report.barangay}</p>
          <p className="text-sm text-muted">
            {report.municipality}, {report.province}
          </p>
        </div>
      </div>

      {/* ── Reason pill ── */}
      {report.reason && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-circuit-light rounded-lg px-3 py-1.5">
          <FileText size={12} className="flex-shrink-0" />
          <span className="truncate">{report.reason}</span>
        </div>
      )}

      {/* ── Notes ── */}
      {report.notes && (
        <p className="text-sm text-slate-600 leading-relaxed flex-1">
          {truncate(report.notes, 110)}
        </p>
      )}

      {/* ── Start time — mono readout ── */}
      <div className="flex items-center gap-1.5 text-xs text-muted font-mono">
        <Clock size={12} />
        <span>Started {formatDate(report.startTime)}</span>
      </div>

      {/* ── Footer: confirm + detail link ── */}
      <div className="flex items-center justify-between pt-3 border-t border-circuit-light gap-2 flex-wrap">
        <ConfirmButton
          reportId={report.id}
          confirmations={report.confirmations}
          restoredVotes={report.restoredVotes}
          onUpdate={(updated) => onUpdate?.(report.id, updated)}
        />
        <div className="flex items-center gap-3">
          {report.sourceUrl && (
            <a
              href={report.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-live-amber hover:brightness-110 hover:underline flex-shrink-0"
            >
              Official Advisory ↗
            </a>
          )}
          <Link
            to={`/reports/${report.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-live-amber hover:underline flex-shrink-0"
          >
            View Details <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
