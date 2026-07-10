import { Link } from "react-router-dom";
import { MapPin, Clock, ArrowRight, FileText } from "lucide-react";
import Card from "../common/Card";
import Badge from "../common/Badge";
import ConfirmButton from "./ConfirmButton";
import { formatDate, timeAgo, truncate } from "../../utils";

/**
 * Full report card for the Reports listing page.
 * @param {Object}   report   - The report data object
 * @param {Function} onUpdate - Called when confirmation counts change
 */
export default function ReportCard({ report, onUpdate }) {
  return (
    <Card className="flex flex-col gap-4 h-full">
      {/* ── Header: status + time ── */}
      <div className="flex items-start justify-between gap-2">
        <Badge status={report.status} />
        <span className="text-xs text-muted flex-shrink-0">{timeAgo(report.createdAt)}</span>
      </div>

      {/* ── Location ── */}
      <div className="flex items-start gap-2">
        <MapPin size={15} className="text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold text-slate-800 leading-snug">{report.barangay}</p>
          <p className="text-sm text-muted">
            {report.municipality}, {report.province}
          </p>
        </div>
      </div>

      {/* ── Reason pill ── */}
      {report.reason && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5">
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

      {/* ── Start time ── */}
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Clock size={12} />
        <span>Started {formatDate(report.startTime)}</span>
      </div>

      {/* ── Footer: confirm + detail link ── */}
      <div className="flex items-center justify-between pt-3 border-t border-border gap-2 flex-wrap">
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
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline flex-shrink-0"
            >
              Official Advisory ↗
            </a>
          )}
          <Link
            to={`/reports/${report.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline flex-shrink-0"
          >
            View Details <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </Card>
  );
}
