import { formatDate } from "../../utils";
import { Clock, CheckCircle, Zap, RefreshCw } from "lucide-react";

/**
 * Vertical timeline for a report's lifecycle events.
 * @param {Object} report - The report data object
 */
export default function ReportTimeline({ report }) {
  const events = [
    {
      id: "created",
      icon: Zap,
      label: "Report Submitted",
      time: report.createdAt,
      color: "text-primary",
      bg: "bg-primary/10",
      line: "bg-primary/20",
    },
    {
      id: "started",
      icon: Clock,
      label: "Outage Started",
      time: report.startTime,
      color: "text-danger",
      bg: "bg-danger/10",
      line: "bg-danger/20",
    },
    report.estimatedEnd && {
      id: "estimated",
      icon: RefreshCw,
      label: "Estimated Restoration",
      time: report.estimatedEnd,
      color: "text-warning",
      bg: "bg-warning/10",
      line: "bg-warning/20",
      isEstimate: true,
    },
    report.status === "restored" && {
      id: "restored",
      icon: CheckCircle,
      label: "Power Restored",
      time: report.updatedAt,
      color: "text-success",
      bg: "bg-success/10",
      line: null,
    },
  ].filter(Boolean);

  return (
    <div className="flex flex-col">
      {events.map((event, idx) => {
        const Icon = event.icon;
        const isLast = idx === events.length - 1;
        return (
          <div key={event.id} className="flex gap-3">
            {/* Icon + connector line */}
            <div className="flex flex-col items-center">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full ${event.bg} flex items-center justify-center`}>
                <Icon size={15} className={event.color} />
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 my-1 ${event.line || "bg-slate-200"}`} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-${isLast ? "0" : "5"} pt-1`}>
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {event.label}
                {event.isEstimate && (
                  <span className="ml-1.5 text-xs font-normal text-muted">(estimated)</span>
                )}
              </p>
              <p className="text-xs text-muted mt-0.5">{formatDate(event.time)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
