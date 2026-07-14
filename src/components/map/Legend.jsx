/**
 * Map legend overlay — dark grid-ink theme.
 * Uses SVG signal icons instead of plain colored circles.
 */

// Inline SVG signal icons — no emoji, no external library
const ZapIcon = ({ color }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const ClockIcon = ({ color }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckIcon = ({ color }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const HelpIcon = ({ color }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const LEGEND_ITEMS = [
  { Icon: ZapIcon,   color: "#E8432E", label: "Ongoing",   dotGlow: "rgba(232,67,46,0.5)" },
  { Icon: ClockIcon, color: "#FFB020", label: "Scheduled", dotGlow: "rgba(255,176,32,0.4)" },
  { Icon: CheckIcon, color: "#2DD4BF", label: "Restored",  dotGlow: "rgba(45,212,191,0.4)" },
  { Icon: HelpIcon,  color: "#475569", label: "Unknown",   dotGlow: "transparent" },
];

export default function Legend() {
  return (
    <div
      className="absolute bottom-6 right-3 z-[1000] backdrop-blur-md rounded-xl px-3 py-3"
      style={{
        background: "rgba(11,15,20,0.88)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        minWidth: "110px",
      }}
    >
      <p
        className="text-[9px] font-bold uppercase tracking-widest mb-2.5 font-mono"
        style={{ color: "rgba(248,250,252,0.3)" }}
      >
        Legend
      </p>
      <div className="flex flex-col gap-2">
        {LEGEND_ITEMS.map(({ Icon, color, label, dotGlow }) => (
          <div key={label} className="flex items-center gap-2">
            {/* Signal icon with subtle glow ring */}
            <span
              className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
              style={{
                background: `${color}18`,
                border: `1px solid ${color}35`,
              }}
            >
              <Icon color={color} />
            </span>
            <span className="text-xs font-medium" style={{ color: "rgba(248,250,252,0.75)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
