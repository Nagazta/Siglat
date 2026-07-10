import clsx from "clsx";
import { getStatusConfig } from "../../utils";

/**
 * Reusable Badge component.
 * Can render a status badge (with colored dot) or a custom label.
 *
 * @param {string} status - One of "ongoing" | "scheduled" | "restored" | "unknown"
 * @param {string} label  - Override label text
 * @param {"sm"|"md"} size
 */
export default function Badge({ status, label, size = "md", className = "" }) {
  const config = status ? getStatusConfig(status) : null;

  const displayLabel = label || config?.label || "";
  const colorClass = config ? `${config.color} ${config.bg}` : "text-slate-600 bg-slate-100";
  const dotClass = config?.dot || "bg-slate-400";

  const sizes = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-xs gap-1.5",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center font-semibold rounded-full",
        sizes[size],
        colorClass,
        className
      )}
    >
      <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", dotClass)} />
      {displayLabel}
    </span>
  );
}
