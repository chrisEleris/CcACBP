import { AlertTriangle, Bell, BellOff, Plus } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataTable } from "../components/DataTable";
import { StatCard } from "../components/StatCard";
import { cloudWatchAlarms, cpuMetrics, networkMetrics } from "../lib/mock-data";

const stateColors: Record<string, string> = {
  OK: "text-emerald-400",
  ALARM: "text-red-400",
  INSUFFICIENT_DATA: "text-gray-400",
};

const stateBg: Record<string, string> = {
  OK: "bg-emerald-500/10 ring-emerald-500/20",
  ALARM: "bg-red-500/10 ring-red-500/20",
  INSUFFICIENT_DATA: "bg-gray-500/10 ring-gray-500/20",
};

export function CloudWatchPage() {
  const okCount = cloudWatchAlarms.filter((a) => a.state === "OK").length;
  const alarmCount = cloudWatchAlarms.filter((a) => a.state === "ALARM").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Alarms OK" value={okCount} icon={<Bell size={22} />} color="green" />
        <StatCard
          title="Alarms Firing"
          value={alarmCount}
          icon={<AlertTriangle size={22} />}
          color="red"
        />
        <StatCard
          title="Insufficient Data"
          value={cloudWatchAlarms.length - okCount - alarmCount}
          icon={<BellOff size={22} />}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-4 text-sm font-medium text-gray-400">CPU Utilization — 24h</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cpuMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-4 text-sm font-medium text-gray-400">Network In (MB) — 24h</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={networkMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} unit=" MB" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">All Alarms</h3>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Create Alarm
        </button>
      </div>

      <DataTable
        data={cloudWatchAlarms}
        keyExtractor={(a) => a.name}
        columns={[
          {
            key: "name",
            header: "Alarm Name",
            render: (a) => <span className="font-medium text-white">{a.name}</span>,
          },
          {
            key: "namespace",
            header: "Namespace",
            render: (a) => a.namespace,
            className: "hidden md:table-cell",
          },
          { key: "metric", header: "Metric", render: (a) => a.metric },
          {
            key: "threshold",
            header: "Threshold",
            render: (a) => a.threshold,
            className: "hidden sm:table-cell",
          },
          {
            key: "period",
            header: "Period",
            render: (a) => a.period,
            className: "hidden lg:table-cell",
          },
          {
            key: "state",
            header: "State",
            render: (a) => (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${stateBg[a.state]} ${stateColors[a.state]}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {a.state.replace("_", " ")}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
