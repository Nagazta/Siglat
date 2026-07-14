import { STATUS } from "../data/mockData";

/**
 * Format a date string into a readable local format.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Return a relative time string (e.g. "2 hours ago").
 * @param {string} dateStr
 * @returns {string}
 */
export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Map a status string to display label, color, and marker color.
 */
export const STATUS_CONFIG = {
  [STATUS.ONGOING]: {
    label: "Ongoing",
    color: "text-fault-red",
    bg: "bg-fault-red/10",
    markerColor: "#E8432E",
    dot: "bg-fault-red",
  },
  [STATUS.SCHEDULED]: {
    label: "Scheduled",
    color: "text-live-amber",
    bg: "bg-live-amber/10",
    markerColor: "#FFB020",
    dot: "bg-live-amber",
  },
  [STATUS.RESTORED]: {
    label: "Restored",
    color: "text-restored-cyan",
    bg: "bg-restored-cyan/10",
    markerColor: "#2DD4BF",
    dot: "bg-restored-cyan",
  },
  [STATUS.UNKNOWN]: {
    label: "Unknown",
    color: "text-muted",
    bg: "bg-slate-100",
    markerColor: "#475569",
    dot: "bg-muted",
  },
};

/**
 * Get status config, falling back to unknown.
 * @param {string} status
 */
export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG[STATUS.UNKNOWN];
}

/**
 * Returns true if the given timestamp is within the last 24 hours.
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isNew(dateStr) {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

/**
 * Truncate text to a max length.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
export function truncate(text, max = 120) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Pluralize a word based on count.
 * @param {number} count
 * @param {string} singular
 * @param {string} plural
 */
export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}
