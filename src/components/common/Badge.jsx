import clsx from "clsx";
import { Zap, Clock, CheckCircle, HelpCircle } from "lucide-react";

/**
 * Grid-themed status badge.
 * - Ongoing  → fault-red + pulsing ring (only animated badge in the system)
 * - Scheduled → live-amber, no animation
 * - Restored  → restored-cyan, no animation
 *
 * @param {string}         status    - "ongoing" | "scheduled" | "restored" | "unknown"
 * @param {string}         label     - Override label text
 * @param {"sm"|"md"}      size
 * @param {string}         className
 */

const STATUS_STYLES = {
  ongoing: {
    icon: Zap,
    label: "Ongoing",
    className: "bg-fault-red/15 text-fault-red border border-fault-red/30 badge-ongoing-ring",
    iconClass: "text-fault-red",
  },
  scheduled: {
    icon: Clock,
    label: "Scheduled",
    className: "bg-live-amber/15 text-live-amber border border-live-amber/30",
    iconClass: "text-live-amber",
  },
  restored: {
    icon: CheckCircle,
    label: "Restored",
    className: "bg-restored-cyan/15 text-restored-cyan border border-restored-cyan/30",
    iconClass: "text-restored-cyan",
  },
  unknown: {
    icon: HelpCircle,
    label: "Unknown",
    className: "bg-slate-100 text-slate-500 border border-slate-200",
    iconClass: "text-slate-400",
  },
};

export default function Badge({ status, label, size = "md", className = "" }) {
  const config = STATUS_STYLES[status] || STATUS_STYLES.unknown;
  const Icon = config.icon;
  const displayLabel = label || config.label;

  const sizes = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  const iconSizes = { sm: 10, md: 12 };

  return (
    <span
      className={clsx(
        "inline-flex items-center font-semibold rounded-md",
        sizes[size],
        config.className,
        className
      )}
    >
      <Icon size={iconSizes[size]} className={clsx("flex-shrink-0", config.iconClass)} />
      {displayLabel}
    </span>
  );
}
