import type { CostData } from "@shared/types";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { StatCard } from "../components/StatCard";
import { useFetch } from "../lib/use-fetch";

function totalCost(d: CostData | undefined): number {
  return d ? d.ec2 + d.s3 + d.rds + d.lambda + d.other : 0;
}

const YEAR = new Date().getFullYear();

export function CostPage() {
  const {
    data: costHistory,
    loading,
    error,
    refetch,
  } = useFetch<CostData[]>("/api/aws/costs/summary");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!costHistory || costHistory.length === 0)
    return <EmptyState message="No cost data available" />;

  const latest = costHistory[costHistory.length - 1];
  const previous = costHistory[costHistory.length - 2];

  const currentSubtitle = latest ? `${latest.month} ${YEAR}` : "";
  const previousSubtitle = previous ? `${previous.month} ${YEAR}` : "";

  const currentTotal = totalCost(latest);
  const previousTotal = totalCost(previous);
  const changePercent =
    previousTotal > 0 ? (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1) : "0";

  const breakdownData = latest
    ? [
        { name: "EC2", value: latest.ec2, color: "#3b82f6" },
        { name: "S3", value: latest.s3, color: "#10b981" },
        { name: "RDS", value: latest.rds, color: "#f59e0b" },
        { name: "Lambda", value: latest.lambda, color: "#8b5cf6" },
        { name: "Other", value: latest.other, color: "#6b7280" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Current Month"
          value={`$${currentTotal.toLocaleString()}`}
          subtitle={currentSubtitle}
          icon={<DollarSign size={22} />}
          color="orange"
        />
        <StatCard
          title="Previous Month"
          value={`$${previousTotal.toLocaleString()}`}
          subtitle={previousSubtitle}
          icon={<DollarSign size={22} />}
          color="blue"
        />
        <StatCard
          title="Month-over-Month"
          value={`${changePercent}%`}
          icon={Number(changePercent) >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          color={Number(changePercent) >= 0 ? "red" : "green"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 md:p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-medium text-gray-400">Cost History (6 months)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={costHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
                formatter={(value: number | undefined) => [`$${value ?? 0}`, undefined]}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="ec2" name="EC2" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="rds" name="RDS" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              <Bar dataKey="s3" name="S3" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="lambda" name="Lambda" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="other" name="Other" fill="#6b7280" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 md:p-5">
          <h3 className="mb-4 text-sm font-medium text-gray-400">Current Month Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={breakdownData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                labelLine={false}
              >
                {breakdownData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
                formatter={(value: number | undefined) => [`$${value ?? 0}`, undefined]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {breakdownData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-400">{entry.name}</span>
                </div>
                <span className="font-medium text-white">${entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
