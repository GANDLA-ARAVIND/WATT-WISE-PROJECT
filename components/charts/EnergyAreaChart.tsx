"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SeriesConfig = {
  key: string;
  label: string;
  color: string;
  yAxisId?: "left" | "right";
  formatValue?: (value: number) => string;
};

type ChartDatum = Record<string, string | number>;

const fallbackData = [
  { label: "Jan", units: 220, amount: 1680 },
  { label: "Feb", units: 205, amount: 1590 },
  { label: "Mar", units: 248, amount: 1820 },
  { label: "Apr", units: 272, amount: 1960 },
  { label: "May", units: 305, amount: 2240 },
];

const fallbackSeries: SeriesConfig[] = [
  { key: "units", label: "Units", color: "#10B981", yAxisId: "left" },
  { key: "amount", label: "Bill amount", color: "#3B82F6", yAxisId: "right" },
];

export function EnergyAreaChart({
  data = fallbackData,
  series = fallbackSeries,
  xKey = "label",
  height = 300,
}: {
  data?: ChartDatum[];
  series?: SeriesConfig[];
  xKey?: string;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            {series.map((item) => (
              <linearGradient key={item.key} id={`${item.key}Gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={item.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={item.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
          <XAxis dataKey={xKey} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} width={42} />
          <YAxis yAxisId="right" orientation="right" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} width={42} />
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
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              yAxisId={item.yAxisId ?? "left"}
              stroke={item.color}
              fill={`url(#${item.key}Gradient)`}
              strokeWidth={2.4}
              activeDot={{ r: 5 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
