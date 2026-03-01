import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Database,
  DollarSign,
  Server,
  Shield,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import {
  cloudWatchAlarms,
  costHistory,
  cpuMetrics,
  ec2Instances,
  iamUsers,
} from "../lib/mock-data";

const alarmsByState = {
  ok: cloudWatchAlarms.filter((a) => a.state === "OK").length,
  alarm: cloudWatchAlarms.filter((a) => a.state === "ALARM").length,
  insufficient: cloudWatchAlarms.filter((a) => a.state === "INSUFFICIENT_DATA").length,
};

const pieData = [
  { name: "OK", value: alarmsByState.ok, color: "#10b981" },
  { name: "Alarm", value: alarmsByState.alarm, color: "#ef4444" },
  { name: "No Data", value: alarmsByState.insufficient, color: "#6b7280" },
];

const latestCost = costHistory[costHistory.length - 1];
const totalMonthlyCost = latestCost
  ? latestCost.ec2 + latestCost.s3 + latestCost.rds + latestCost.lambda + latestCost.other
  : 0;

const costSubtitle = latestCost ? `${latestCost.month} ${new Date().getFullYear()}` : "";
const previousCost = costHistory[costHistory.length - 2];
const previousTotal = previousCost
  ? previousCost.ec2 + previousCost.s3 + previousCost.rds + previousCost.lambda + previousCost.other
  : 0;
const costChangePercent =
  previousTotal > 0 ? (((totalMonthlyCost - previousTotal) / previousTotal) * 100).toFixed(1) : "0";
const costTrendPositive = Number(costChangePercent) <= 0;

const iamUserCount = iamUsers.length;
const iamMfaCount = iamUsers.filter((u) => u.mfaEnabled).length;

export function DashboardPage() {
  const runningInstances = ec2Instances.filter((i) => i.state === "running").length;
  const activeAlarms = cloudWatchAlarms.filter((a) => a.state === "ALARM");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="EC2 Instances"
          value={`${runningInstances}/${ec2Instances.length}`}
          subtitle="running"
          icon={<Server size={22} />}
          color="blue"
        />
        <StatCard
          title="Active Alarms"
          value={activeAlarms.length}
          subtitle={`of ${cloudWatchAlarms.length} total`}
          icon={<AlertTriangle size={22} />}
          color={activeAlarms.length > 0 ? "red" : "green"}
        />
        <StatCard
          title="Monthly Cost"
          value={`$${totalMonthlyCost.toLocaleString()}`}
          subtitle={costSubtitle}
          icon={<DollarSign size={22} />}
          trend={{
            value: `${Math.abs(Number(costChangePercent))}% from last month`,
            positive: costTrendPositive,
          }}
          color="orange"
        />
        <StatCard
          title="IAM Users"
          value={iamUserCount}
          subtitle={`${iamMfaCount} with MFA`}
          icon={<Shield size={22} />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 xl:col-span-2">
          <h3 className="mb-4 text-sm font-medium text-gray-400">
            CPU Utilization (avg) — Last 24h
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cpuMetrics}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                fill="url(#cpuGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-4 text-sm font-medium text-gray-400">Alarm Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
              >
                {pieData.map((entry) => (
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
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex justify-center gap-4">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-4 text-sm font-medium text-gray-400">Active Alarms</h3>
          {activeAlarms.length === 0 ? (
            <div className="flex items-center gap-2 py-8 text-center text-emerald-400">
              <CheckCircle size={18} />
              <span>All systems operational</span>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlarms.map((alarm) => (
                <div
                  key={alarm.name}
                  className="flex items-center justify-between rounded-lg bg-red-500/5 p-3 ring-1 ring-inset ring-red-500/20"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-red-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{alarm.name}</p>
                      <p className="text-xs text-gray-400">
                        {alarm.namespace} — {alarm.metric} {alarm.threshold}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status="error" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-4 text-sm font-medium text-gray-400">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Server size={18} />, label: "Launch Instance", color: "text-blue-400" },
              { icon: <Database size={18} />, label: "Create Bucket", color: "text-emerald-400" },
              { icon: <Activity size={18} />, label: "Create Alarm", color: "text-yellow-400" },
              { icon: <Zap size={18} />, label: "Deploy Lambda", color: "text-purple-400" },
            ].map((action) => (
              <button
                type="button"
                key={action.label}
                className="flex items-center gap-3 rounded-lg border border-gray-700/50 bg-gray-700/20 p-3 text-left transition-colors hover:bg-gray-700/40"
              >
                <span className={action.color}>{action.icon}</span>
                <span className="text-sm text-gray-300">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
