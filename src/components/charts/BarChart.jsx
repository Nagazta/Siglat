import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-card px-3 py-2">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="text-xs text-primary font-bold">{payload[0]?.value} reports</p>
    </div>
  );
};

/**
 * Reusable horizontal or vertical bar chart.
 * @param {Array}   data       - Data array
 * @param {string}  dataKey    - Y-axis / bar value key
 * @param {string}  xKey       - X-axis label key
 * @param {boolean} horizontal - Render as horizontal bar chart
 * @param {Array}   colors     - Optional array of hex colors per bar
 * @param {number}  height     - Chart height in px
 */
export default function BarChart({
  data = [],
  dataKey = "value",
  xKey = "label",
  horizontal = false,
  colors = ["#2563EB"],
  height = 220,
}) {
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBar data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey={dataKey} radius={[0, 6, 6, 0]} maxBarSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </RechartsBar>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBar data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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
        <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} maxBarSize={36}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} fillOpacity={0.85} />
          ))}
        </Bar>
      </RechartsBar>
    </ResponsiveContainer>
  );
}
