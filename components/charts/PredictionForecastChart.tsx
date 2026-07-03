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

type ForecastDatum = {
  label: string;
  units: number;
  amount: number;
  type: string;
};

export function PredictionForecastChart({
  data,
  height = 320,
}: {
  data: ForecastDatum[];
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastUnitsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="forecastAmountGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
          <XAxis dataKey="label" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
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
          <Area
            type="monotone"
            dataKey="units"
            name="Units forecast"
            yAxisId="left"
            stroke="#10B981"
            fill="url(#forecastUnitsGradient)"
            strokeWidth={2.4}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            name="Bill forecast"
            yAxisId="right"
            stroke="#3B82F6"
            fill="url(#forecastAmountGradient)"
            strokeWidth={2.2}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
