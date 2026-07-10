import { Link } from "react-router-dom";
import { MapPin, Clock, ThumbsUp, ArrowRight } from "lucide-react";
import Badge from "../common/Badge";
import { formatDate, timeAgo } from "../../utils";

/**
 * Content rendered inside a Leaflet Popup when a marker is clicked.
 * Kept intentionally compact — full details live at /reports/:id.
 *
 * @param {Object} report - The report data object
 */
export default function ReportPopup({ report }) {
  return (
    <div className="font-sans text-slate-800 min-w-[200px]">
      {/* Status + time ago */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge status={report.status} size="sm" />
        <span className="text-xs text-slate-500">{timeAgo(report.createdAt)}</span>
      </div>

      {/* Location */}
      <div className="flex items-start gap-1.5 mb-1">
        <MapPin size={13} className="text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-sm leading-tight">{report.barangay}</p>
          <p className="text-xs text-slate-500">
            {report.municipality}, {report.province}
          </p>
        </div>
      </div>

      {/* Start time */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
        <Clock size={12} />
        <span>Started: {formatDate(report.startTime)}</span>
      </div>

      {/* Notes preview */}
      {report.notes && (
        <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 mb-2 line-clamp-2">
          {report.notes}
        </p>
      )}

      {/* Confirmations + link */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <ThumbsUp size={11} />
          {report.confirmations} confirmed
        </span>
        <Link
          to={`/reports/${report.id}`}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline"
        >
          Details <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}
