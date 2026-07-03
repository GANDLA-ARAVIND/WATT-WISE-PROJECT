"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type PieDatum = {
  name: string;
  value: number;
  color?: string;
};

const fallbackData = [
  { name: "Cooling", value: 38, color: "#10B981" },
  { name: "Always Active", value: 24, color: "#3B82F6" },
  { name: "Lighting", value: 18, color: "#F59E0B" },
  { name: "Utility", value: 20, color: "#F97316" }
];

const fallbackColors = ["#10B981", "#3B82F6", "#F59E0B", "#F97316", "#8B5CF6"];

export function EnergyPieChart({
  data = fallbackData,
  height = 240,
}: {
  data?: PieDatum[];
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              backgroundColor: "#0B0F19",
              borderRadius: "12px",
              border: "1px solid #1F2937",
              color: "#F9FAFB"
            }}
          />
          <Legend wrapperStyle={{ color: "#CBD5E1", fontSize: "12px" }} />
          <Pie
            data={data}
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${entry.name}`} fill={entry.color ?? fallbackColors[index % fallbackColors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
