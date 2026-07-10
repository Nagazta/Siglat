/**
 * Map legend overlay — shown in bottom-right corner of the map.
 * Uses a Leaflet-independent absolute-positioned div so it works
 * regardless of map library version.
 */
export default function Legend() {
  const items = [
    { color: "#EF4444", label: "Ongoing" },
    { color: "#FACC15", label: "Scheduled" },
    { color: "#22C55E", label: "Restored" },
    { color: "#94A3B8", label: "Unknown" },
  ];

  return (
    <div className="absolute bottom-6 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-card border border-border px-3 py-2.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        Legend
      </p>
      <div className="flex flex-col gap-1.5">
        {items.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full border-2 border-white flex-shrink-0"
              style={{ backgroundColor: color, boxShadow: `0 0 0 1px ${color}40` }}
            />
            <span className="text-xs text-slate-600 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
