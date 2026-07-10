import {
  AreaChart as RechartsArea,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-card px-3 py-2">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

/**
 * Reusable area/line chart component.
 * @param {Array}  data      - Array of data objects
 * @param {string} dataKey   - Key in data to plot on Y axis
 * @param {string} xKey      - Key in data for X axis labels
 * @param {string} color     - Stroke/fill color (hex)
 * @param {string} name      - Series display name in tooltip
 * @param {number} height    - Chart height in px
 */
export default function AreaChart({
  data = [],
  dataKey = "value",
  xKey = "label",
  color = "#2563EB",
  name = "Reports",
  height = 220,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsArea data={data}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#grad-${dataKey})`}
          dot={{ fill: color, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </RechartsArea>
    </ResponsiveContainer>
  );
}
