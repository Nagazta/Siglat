import { Link } from "react-router-dom";
import { MapPin, Clock, ThumbsUp, ArrowRight, ExternalLink } from "lucide-react";
import Badge from "../common/Badge";
import SourceTag from "../common/SourceTag";
import { formatDate, timeAgo } from "../../utils";

/**
 * Content rendered inside a Leaflet Popup when a marker is clicked.
 * Grid-ink themed, SVG icons only — no emojis, no text arrows.
 *
 * @param {Object} report - The report data object
 */
export default function ReportPopup({ report }) {
  const accentColor =
    report.status === "ongoing"   ? "#E8432E"
    : report.status === "restored" ? "#2DD4BF"
    : "#FFB020";

  return (
    <div className="font-sans min-w-[210px]" style={{ color: "#1E293B" }}>
      {/* Status + time */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <Badge status={report.status} size="sm" />
          <SourceTag sourceUrl={report.sourceUrl} />
        </div>
        <span className="text-[10px] font-mono" style={{ color: "#94A3B8" }}>
          {timeAgo(report.createdAt)}
        </span>
      </div>

      {/* Location */}
      <div className="flex items-start gap-1.5 mb-1.5">
        <MapPin size={13} className="mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
        <div>
          <p className="font-semibold text-sm leading-tight" style={{ color: "#0F172A" }}>
            {report.barangay}
          </p>
          <p className="text-xs" style={{ color: "#64748B" }}>
            {report.municipality}, {report.province}
          </p>
        </div>
      </div>

      {/* Start time */}
      <div className="flex items-center gap-1.5 text-xs mb-2.5 font-mono" style={{ color: "#94A3B8" }}>
        <Clock size={11} />
        <span>Started {formatDate(report.startTime)}</span>
      </div>

      {/* Notes preview */}
      {report.notes && (
        <div
          className="text-xs rounded-lg px-2.5 py-1.5 mb-2.5 max-h-20 overflow-y-auto whitespace-pre-line leading-relaxed"
          style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#475569" }}
        >
          {report.notes}
        </div>
      )}

      {/* Footer: confirmations + links */}
      <div
        className="flex items-center justify-between pt-2"
        style={{ borderTop: "1px solid #E2E8F0" }}
      >
        <span className="flex items-center gap-1 text-xs font-mono" style={{ color: "#94A3B8" }}>
          <ThumbsUp size={11} />
          {report.confirmations} confirmed
        </span>
        <div className="flex items-center gap-2.5">
          {report.sourceUrl && (
            <a
              href={report.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-xs font-semibold transition-colors hover:underline"
              style={{ color: "#FFB020" }}
            >
              Advisory
              <ExternalLink size={10} />
            </a>
          )}
          <Link
            to={`/reports/${report.id}`}
            className="inline-flex items-center gap-0.5 text-xs font-semibold transition-colors hover:underline"
            style={{ color: "#FFB020" }}
          >
            Details
            <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}
