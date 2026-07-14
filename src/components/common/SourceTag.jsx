import { Globe, Users } from "lucide-react";

const FacebookIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

/**
 * Renders a small badge showing the origin of an advisory.
 * - Facebook
 * - VECO Website
 * - Community
 *
 * @param {string} sourceUrl - The source reference URL
 */
export default function SourceTag({ sourceUrl }) {
  if (!sourceUrl) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
        style={{
          backgroundColor: "rgba(100, 116, 139, 0.08)",
          color: "#475569",
          border: "1px solid rgba(100, 116, 139, 0.2)",
        }}
      >
        <Users size={10} />
        Community
      </span>
    );
  }

  const url = sourceUrl.toLowerCase();

  if (url.includes("facebook.com")) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
        style={{
          backgroundColor: "rgba(24, 119, 242, 0.08)",
          color: "#1877F2",
          border: "1px solid rgba(24, 119, 242, 0.2)",
        }}
      >
        <FacebookIcon />
        Facebook
      </span>
    );
  }

  if (url.includes("visayanelectric.com") || url.includes("veco")) {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
        style={{
          backgroundColor: "rgba(255, 176, 32, 0.08)",
          color: "#D97706",
          border: "1px solid rgba(255, 176, 32, 0.2)",
        }}
      >
        <Globe size={10} />
        VECO Web
      </span>
    );
  }

  // Fallback generic external source
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
      style={{
        backgroundColor: "rgba(100, 116, 139, 0.08)",
        color: "#475569",
        border: "1px solid rgba(100, 116, 139, 0.2)",
      }}
    >
      <Globe size={10} />
      External
    </span>
  );
}
