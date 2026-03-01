import type { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  color?: "blue" | "green" | "orange" | "red" | "purple";
};

const colorMap = {
  blue: "bg-blue-500/10 text-blue-400",
  green: "bg-emerald-500/10 text-emerald-400",
  orange: "bg-orange-500/10 text-orange-400",
  red: "bg-red-500/10 text-red-400",
  purple: "bg-purple-500/10 text-purple-400",
};

export function StatCard({ title, value, subtitle, icon, trend, color = "blue" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="mt-1 text-xl font-bold text-white md:text-2xl">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          {trend && (
            <p
              className={`mt-1 text-xs font-medium ${trend.positive ? "text-emerald-400" : "text-red-400"}`}
            >
              {trend.positive ? "+" : ""}
              {trend.value}
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${colorMap[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
