import type {
  ECSCluster,
  ECSEvent,
  ECSService,
  ECSServiceHealth,
  ECSTask,
  ECSTaskStatus,
} from "@shared/types";
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Container,
  Cpu,
  HardDrive,
  Layers,
  Play,
  RefreshCcw,
  RotateCcw,
  Server,
  Square,
  XCircle,
  Zap,
} from "lucide-react";
import { Fragment, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { StatCard } from "../components/StatCard";
import { useFetch } from "../lib/use-fetch";

// ── Helpers ───────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function taskStatusColor(status: ECSTaskStatus): string {
  const map: Record<ECSTaskStatus, string> = {
    PROVISIONING: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    PENDING: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
    RUNNING: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    STOPPING: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
    STOPPED: "bg-red-500/10 text-red-400 ring-red-500/20",
  };
  return map[status];
}

function healthColor(health: ECSServiceHealth): string {
  const map: Record<ECSServiceHealth, string> = {
    HEALTHY: "text-emerald-400",
    ROLLING: "text-blue-400",
    UNHEALTHY: "text-red-400",
    SCALING: "text-yellow-400",
  };
  return map[health];
}

function healthIcon(health: ECSServiceHealth) {
  switch (health) {
    case "HEALTHY":
      return <CheckCircle2 size={14} className="text-emerald-400" />;
    case "ROLLING":
      return <RefreshCcw size={14} className="animate-spin text-blue-400" />;
    case "UNHEALTHY":
      return <XCircle size={14} className="text-red-400" />;
    case "SCALING":
      return <ArrowDownUp size={14} className="text-yellow-400" />;
  }
}

function eventTypeColor(type: ECSEvent["type"]): string {
  const map: Record<ECSEvent["type"], string> = {
    DEPLOYMENT: "text-blue-400",
    SCALING: "text-yellow-400",
    TASK: "text-gray-400",
    ERROR: "text-red-400",
  };
  return map[type];
}

function eventTypeBadgeColor(type: ECSEvent["type"]): string {
  const map: Record<ECSEvent["type"], string> = {
    DEPLOYMENT: "bg-blue-500/10 text-blue-400",
    SCALING: "bg-yellow-500/10 text-yellow-400",
    TASK: "bg-gray-500/10 text-gray-400",
    ERROR: "bg-red-500/10 text-red-400",
  };
  return map[type];
}

function utilizationColor(pct: number): string {
  if (pct >= 80) return "bg-red-500";
  if (pct >= 60) return "bg-yellow-500";
  return "bg-emerald-500";
}

// ── Sub-components ────────────────────────────────────────

function UtilizationBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${utilizationColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-medium tabular-nums text-gray-300">{pct}%</span>
    </div>
  );
}

function ClusterCard({
  cluster,
  isSelected,
  onSelect,
}: {
  cluster: ECSCluster;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        isSelected
          ? "border-blue-500/50 bg-blue-500/5"
          : "border-gray-700/50 bg-gray-800/50 hover:border-gray-600/50"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-blue-400" />
          <span className="text-sm font-semibold text-white">{cluster.name}</span>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
          {cluster.status}
        </span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-gray-500">
          Services: <span className="text-gray-300">{cluster.activeServices}</span>
        </div>
        <div className="text-gray-500">
          Instances: <span className="text-gray-300">{cluster.registeredInstances}</span>
        </div>
        <div className="text-gray-500">
          Running: <span className="text-emerald-400">{cluster.runningTasks}</span>
        </div>
        <div className="text-gray-500">
          Pending:{" "}
          <span className={cluster.pendingTasks > 0 ? "text-yellow-400" : "text-gray-300"}>
            {cluster.pendingTasks}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        <UtilizationBar label="CPU Rsv" pct={cluster.cpuReservation} />
        <UtilizationBar label="Mem Rsv" pct={cluster.memoryReservation} />
      </div>
    </button>
  );
}

function ServiceRow({
  service,
  isExpanded,
  onToggle,
  tasks,
}: {
  service: ECSService;
  isExpanded: boolean;
  onToggle: () => void;
  tasks: ECSTask[];
}) {
  const countMismatch = service.desiredCount !== service.runningCount;
  const primaryDeployment = service.deployments.find((d) => d.status === "PRIMARY");

  return (
    <Fragment>
      <tr
        className="cursor-pointer border-b border-gray-700/30 transition-colors hover:bg-white/[0.02]"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown size={14} className="shrink-0 text-gray-500" />
            ) : (
              <ChevronRight size={14} className="shrink-0 text-gray-500" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-white">{service.name}</span>
                <span className="shrink-0 rounded bg-gray-700/50 px-1.5 py-0.5 text-[10px] text-gray-400">
                  {service.launchType}
                </span>
              </div>
              <p className="truncate text-xs text-gray-500">{service.taskDefinition}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {healthIcon(service.health)}
            <span className={`text-xs font-medium ${healthColor(service.health)}`}>
              {service.health}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-baseline gap-1">
            <span
              className={`text-sm font-semibold ${countMismatch ? "text-yellow-400" : "text-white"}`}
            >
              {service.runningCount}
            </span>
            <span className="text-xs text-gray-500">/ {service.desiredCount}</span>
            {service.pendingCount > 0 && (
              <span className="text-xs text-yellow-400">+{service.pendingCount}p</span>
            )}
          </div>
        </td>
        <td className="hidden px-4 py-3 sm:table-cell">
          <UtilizationBar label="" pct={service.cpuUtilization} />
        </td>
        <td className="hidden px-4 py-3 md:table-cell">
          <UtilizationBar label="" pct={service.memoryUtilization} />
        </td>
        <td className="hidden px-4 py-3 lg:table-cell">
          {primaryDeployment && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                primaryDeployment.rolloutState === "COMPLETED"
                  ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                  : primaryDeployment.rolloutState === "IN_PROGRESS"
                    ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
                    : "bg-red-500/10 text-red-400 ring-red-500/20"
              }`}
            >
              {primaryDeployment.rolloutState}
            </span>
          )}
        </td>
        <td className="hidden px-4 py-3 lg:table-cell">
          <span className="text-xs text-gray-500">{timeAgo(service.lastDeployment)}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-1.5 text-blue-400 hover:bg-blue-500/10"
              aria-label="Force new deployment"
              onClick={(e) => e.stopPropagation()}
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              className="rounded p-1.5 text-yellow-400 hover:bg-yellow-500/10"
              aria-label="Scale service"
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowDownUp size={14} />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-gray-700/30 bg-gray-900/40">
          <td colSpan={8} className="px-4 py-4">
            <ServiceDetail service={service} tasks={tasks} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function ServiceDetail({
  service,
  tasks,
}: {
  service: ECSService;
  tasks: ECSTask[];
}) {
  return (
    <div className="space-y-4">
      {/* Scaling config */}
      <div className="rounded-lg border border-gray-700/30 bg-gray-800/30 p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Auto-Scaling
        </h4>
        {service.scaling.enabled ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="text-gray-500">
                Min: <span className="text-white">{service.scaling.minCapacity}</span>
              </span>
              <span className="text-gray-500">
                Max: <span className="text-white">{service.scaling.maxCapacity}</span>
              </span>
              <span className="text-gray-500">
                Current: <span className="text-white">{service.desiredCount}</span>
              </span>
            </div>
            {service.scaling.policies.map((p) => (
              <div
                key={p.policyName}
                className="flex flex-wrap items-center gap-2 text-xs text-gray-400"
              >
                <span className="rounded bg-gray-700/50 px-1.5 py-0.5 text-[10px] text-gray-300">
                  {p.metricType}
                </span>
                <span>Target: {p.targetValue}%</span>
                <span className="text-gray-600">|</span>
                <span>Up: {p.scaleUpCooldown}s</span>
                <span>Down: {p.scaleDownCooldown}s</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-500">
            Disabled — fixed at {service.desiredCount} tasks
          </span>
        )}
      </div>

      {/* Deployments */}
      {service.deployments.length > 0 && (
        <div className="rounded-lg border border-gray-700/30 bg-gray-800/30 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Deployments
          </h4>
          <div className="space-y-2">
            {service.deployments.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 text-xs">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    d.status === "PRIMARY"
                      ? "bg-blue-500/10 text-blue-400"
                      : d.status === "ACTIVE"
                        ? "bg-gray-500/10 text-gray-400"
                        : "bg-gray-700/50 text-gray-500"
                  }`}
                >
                  {d.status}
                </span>
                <span className="font-mono text-gray-300">{d.taskDefinition}</span>
                <span className="text-gray-500">
                  {d.runningCount}/{d.desiredCount} running
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset ${
                    d.rolloutState === "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                      : d.rolloutState === "IN_PROGRESS"
                        ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
                        : "bg-red-500/10 text-red-400 ring-red-500/20"
                  }`}
                >
                  {d.rolloutState}
                </span>
                <span className="text-gray-600">{timeAgo(d.updatedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <div className="rounded-lg border border-gray-700/30 bg-gray-800/30 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Tasks ({tasks.length})
          </h4>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.taskId}
                className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-900/50 px-3 py-2 text-xs"
              >
                <span className="font-mono text-gray-300">{task.taskId}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${taskStatusColor(task.status)}`}
                >
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {task.status}
                </span>
                <span className="text-gray-500">
                  <Cpu size={10} className="mr-0.5 inline" />
                  {task.cpuUtilization}%
                </span>
                <span className="text-gray-500">
                  <HardDrive size={10} className="mr-0.5 inline" />
                  {task.memoryUtilization}%
                </span>
                <span className="hidden text-gray-600 sm:inline">{task.privateIp}</span>
                {task.stoppedReason && (
                  <span className="basis-full text-[10px] text-red-400">{task.stoppedReason}</span>
                )}
                <div className="ml-auto flex gap-1">
                  {task.status === "RUNNING" && (
                    <button
                      type="button"
                      className="rounded p-1 text-red-400 hover:bg-red-500/10"
                      aria-label="Stop task"
                    >
                      <Square size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span>
          Load Balancer:{" "}
          {service.loadBalancerTarget ? (
            <span className="text-gray-400">Attached</span>
          ) : (
            <span className="text-gray-600">None</span>
          )}
        </span>
        <span>
          Updated by: <span className="text-gray-400">{service.updatedBy}</span>
        </span>
        <span>
          Created: <span className="text-gray-400">{timeAgo(service.createdAt)}</span>
        </span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export function ECSPage() {
  const {
    data: ecsClusters,
    loading: clustersLoading,
    error: clustersError,
    refetch: refetchClusters,
  } = useFetch<ECSCluster[]>("/api/ecs/clusters");

  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<"all" | ECSTaskStatus>("all");

  if (clustersLoading) return <LoadingState />;
  if (clustersError) return <ErrorState message={clustersError} onRetry={refetchClusters} />;
  if (!ecsClusters || ecsClusters.length === 0)
    return <EmptyState message="No ECS clusters found" />;

  const activeClusterName = selectedCluster ?? ecsClusters[0].name;
  const cluster = ecsClusters.find((c) => c.name === activeClusterName) ?? ecsClusters[0];

  return (
    <ECSPageContent
      ecsClusters={ecsClusters}
      selectedCluster={activeClusterName}
      setSelectedCluster={setSelectedCluster}
      cluster={cluster}
      expandedService={expandedService}
      setExpandedService={setExpandedService}
      taskFilter={taskFilter}
      setTaskFilter={setTaskFilter}
    />
  );
}

function ECSPageContent({
  ecsClusters,
  selectedCluster,
  setSelectedCluster,
  cluster,
  expandedService,
  setExpandedService,
  taskFilter,
  setTaskFilter,
}: {
  ecsClusters: ECSCluster[];
  selectedCluster: string;
  setSelectedCluster: (name: string) => void;
  cluster: ECSCluster;
  expandedService: string | null;
  setExpandedService: (name: string | null) => void;
  taskFilter: "all" | ECSTaskStatus;
  setTaskFilter: (filter: "all" | ECSTaskStatus) => void;
}) {
  const { data: ecsServicesData } = useFetch<ECSService[]>(`/api/ecs/services/${selectedCluster}`);
  const { data: ecsTasksData } = useFetch<ECSTask[]>(
    `/api/ecs/tasks/${selectedCluster}/${selectedCluster}`,
  );
  const { data: ecsEventsData } = useFetch<ECSEvent[]>(`/api/ecs/events/${selectedCluster}`);

  const services = (ecsServicesData ?? []).filter((s) => s.clusterName === selectedCluster);
  const clusterTasks = (ecsTasksData ?? []).filter((t) => t.clusterName === selectedCluster);
  const events = ecsEventsData ?? [];

  const totalRunning = services.reduce((sum, s) => sum + s.runningCount, 0);
  const totalDesired = services.reduce((sum, s) => sum + s.desiredCount, 0);
  const unhealthyServices = services.filter(
    (s) => s.health === "UNHEALTHY" || s.health === "SCALING",
  ).length;

  const filteredTasks =
    taskFilter === "all" ? clusterTasks : clusterTasks.filter((t) => t.status === taskFilter);

  const taskStatusCounts: Record<string, number> = {};
  for (const t of clusterTasks) {
    taskStatusCounts[t.status] = (taskStatusCounts[t.status] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Cluster selector */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ecsClusters.map((c) => (
          <ClusterCard
            key={c.name}
            cluster={c}
            isSelected={c.name === selectedCluster}
            onSelect={() => setSelectedCluster(c.name)}
          />
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Active Services"
          value={cluster.activeServices}
          icon={<Container size={22} />}
          color="blue"
          subtitle={`${unhealthyServices > 0 ? `${unhealthyServices} need attention` : "All healthy"}`}
        />
        <StatCard
          title="Running Tasks"
          value={`${totalRunning} / ${totalDesired}`}
          icon={<Play size={22} />}
          color="green"
          subtitle={`${cluster.pendingTasks} pending`}
        />
        <StatCard
          title="CPU Utilization"
          value={`${cluster.cpuUtilization}%`}
          icon={<Cpu size={22} />}
          color={
            cluster.cpuUtilization >= 80 ? "red" : cluster.cpuUtilization >= 60 ? "orange" : "blue"
          }
          subtitle={`${cluster.cpuReservation}% reserved`}
        />
        <StatCard
          title="Memory Utilization"
          value={`${cluster.memoryUtilization}%`}
          icon={<HardDrive size={22} />}
          color={
            cluster.memoryUtilization >= 80
              ? "red"
              : cluster.memoryUtilization >= 60
                ? "orange"
                : "purple"
          }
          subtitle={`${cluster.memoryReservation}% reserved`}
        />
      </div>

      {/* Services table */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700/30 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Server size={16} className="text-blue-400" />
            Services ({services.length})
          </h3>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Play size={12} />
            Create Service
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/30 text-left">
                <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Service
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Health
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tasks
                </th>
                <th className="hidden whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  CPU
                </th>
                <th className="hidden whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                  Memory
                </th>
                <th className="hidden whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell">
                  Deployment
                </th>
                <th className="hidden whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell">
                  Last Updated
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <ServiceRow
                  key={svc.name}
                  service={svc}
                  isExpanded={expandedService === svc.name}
                  onToggle={() =>
                    setExpandedService(expandedService === svc.name ? null : svc.name)
                  }
                  tasks={filteredTasks.filter((t) => t.serviceName === svc.name)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tasks overview + Events side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Tasks summary */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 backdrop-blur-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Box size={16} className="text-emerald-400" />
              Tasks ({clusterTasks.length})
            </h3>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setTaskFilter("all")}
                className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                  taskFilter === "all"
                    ? "bg-gray-600 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                All
              </button>
              {(["RUNNING", "PENDING", "PROVISIONING", "STOPPED"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTaskFilter(status)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                    taskFilter === status
                      ? "bg-gray-600 text-white"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {status} {taskStatusCounts[status] ? `(${taskStatusCounts[status]})` : ""}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-600">No tasks match filter.</p>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.taskId}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-700/20 bg-gray-900/30 px-3 py-2 text-xs"
                >
                  <span className="font-mono text-gray-300">{task.taskId}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${taskStatusColor(task.status)}`}
                  >
                    <span className="h-1 w-1 rounded-full bg-current" />
                    {task.status}
                  </span>
                  <span className="text-gray-500">{task.serviceName}</span>
                  {task.status === "RUNNING" && (
                    <span className="text-gray-600">
                      CPU {task.cpuUtilization}% · Mem {task.memoryUtilization}%
                    </span>
                  )}
                  <span className="ml-auto text-gray-600">{timeAgo(task.startedAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent events */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 backdrop-blur-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Activity size={16} className="text-orange-400" />
            Recent Events
          </h3>
          <div className="space-y-3">
            {events.map((evt) => (
              <div key={evt.id} className="flex gap-3 text-xs">
                <div className="flex shrink-0 flex-col items-center">
                  <span className={`mt-0.5 ${eventTypeColor(evt.type)}`}>
                    {evt.type === "ERROR" ? (
                      <AlertTriangle size={14} />
                    ) : evt.type === "DEPLOYMENT" ? (
                      <Zap size={14} />
                    ) : evt.type === "SCALING" ? (
                      <ArrowDownUp size={14} />
                    ) : (
                      <Clock size={14} />
                    )}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${eventTypeBadgeColor(evt.type)}`}
                    >
                      {evt.type}
                    </span>
                    <span className="text-gray-600">{timeAgo(evt.timestamp)}</span>
                  </div>
                  <p className="text-gray-400">{evt.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
