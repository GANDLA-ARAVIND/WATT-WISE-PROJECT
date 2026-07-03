"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BarSeries = {
  key: string;
  label: string;
  color: string;
};

type ChartDatum = Record<string, string | number>;

const fallbackData = [
  { season: "Summer", averageUnits: 298, averageAmount: 2260 },
  { season: "Rainy", averageUnits: 224, averageAmount: 1710 },
  { season: "Winter/Cooler", averageUnits: 246, averageAmount: 1880 },
];

const fallbackSeries: BarSeries[] = [
  { key: "averageUnits", label: "Avg units", color: "#10B981" },
  { key: "averageAmount", label: "Avg amount", color: "#3B82F6" },
];

export function EnergyBarChart({
  data = fallbackData,
  series = fallbackSeries,
  xKey = "season",
  height = 260,
}: {
  data?: ChartDatum[];
  series?: BarSeries[];
  xKey?: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 10, top: 8, bottom: 0 }} barGap={10}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
          <XAxis dataKey={xKey} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0B0F19",
              borderRadius: "14px",
              border: "1px solid #1F2937",
              color: "#F9FAFB",
            }}
          />
          <Legend wrapperStyle={{ color: "#CBD5E1", fontSize: "12px" }} />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              fill={item.color}
              radius={[10, 10, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
