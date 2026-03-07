import type {
  DeployEnvironment,
  DeployPipeline,
  DeploySchedule,
  DeployStatus,
  DeployStrategyType,
  EnvironmentState,
} from "@shared/types";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  GitBranch,
  Loader2,
  Pause,
  Play,
  RefreshCcw,
  Rocket,
  RotateCcw,
  Shield,
  XCircle,
} from "lucide-react";
import { Fragment, useState } from "react";
import { StatCard } from "../components/StatCard";
import {
  deployPipelines,
  deployRollbacks,
  deploySchedules,
  environmentStates,
} from "../lib/mock-data";
import { timeAgo } from "../utils/time";

// ── Helpers ───────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusColor(status: DeployStatus | "WAITING" | "SKIPPED"): string {
  const map: Record<typeof status, string> = {
    PENDING_APPROVAL: "text-yellow-400",
    APPROVED: "text-blue-400",
    IN_PROGRESS: "text-blue-400",
    HEALTH_CHECK: "text-cyan-400",
    COMPLETED: "text-emerald-400",
    FAILED: "text-red-400",
    ROLLED_BACK: "text-orange-400",
    CANCELLED: "text-gray-500",
    WAITING: "text-gray-600",
    SKIPPED: "text-gray-600",
  };
  return map[status];
}

function statusBadgeColor(status: DeployStatus | "WAITING" | "SKIPPED"): string {
  const map: Record<typeof status, string> = {
    PENDING_APPROVAL: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
    APPROVED: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    IN_PROGRESS: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    HEALTH_CHECK: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    FAILED: "bg-red-500/10 text-red-400 ring-red-500/20",
    ROLLED_BACK: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
    CANCELLED: "bg-gray-500/10 text-gray-500 ring-gray-500/20",
    WAITING: "bg-gray-500/5 text-gray-600 ring-gray-700/20",
    SKIPPED: "bg-gray-500/5 text-gray-600 ring-gray-700/20",
  };
  return map[status];
}

function statusIcon(status: DeployStatus | "WAITING" | "SKIPPED") {
  switch (status) {
    case "PENDING_APPROVAL":
      return <Pause size={12} />;
    case "APPROVED":
      return <CheckCircle2 size={12} />;
    case "IN_PROGRESS":
      return <Loader2 size={12} className="animate-spin" />;
    case "HEALTH_CHECK":
      return <RefreshCcw size={12} className="animate-spin" />;
    case "COMPLETED":
      return <CheckCircle2 size={12} />;
    case "FAILED":
      return <XCircle size={12} />;
    case "ROLLED_BACK":
      return <RotateCcw size={12} />;
    case "CANCELLED":
      return <XCircle size={12} />;
    case "WAITING":
      return <Clock size={12} />;
    case "SKIPPED":
      return <ArrowRight size={12} />;
  }
}

function strategyBadge(strategy: DeployStrategyType): string {
  const map: Record<DeployStrategyType, string> = {
    rolling: "bg-blue-500/10 text-blue-400",
    "blue-green": "bg-indigo-500/10 text-indigo-400",
    canary: "bg-amber-500/10 text-amber-400",
  };
  return map[strategy];
}

function envColor(env: DeployEnvironment): string {
  const map: Record<DeployEnvironment, string> = {
    dev: "bg-gray-500/10 text-gray-400 ring-gray-500/20",
    staging: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
    prod: "bg-red-500/10 text-red-400 ring-red-500/20",
  };
  return map[env];
}

function healthDot(health: EnvironmentState["health"]): string {
  const map: Record<EnvironmentState["health"], string> = {
    HEALTHY: "bg-emerald-400",
    DEGRADED: "bg-yellow-400",
    UNHEALTHY: "bg-red-400",
  };
  return map[health];
}

// ── Sub-components ────────────────────────────────────────

function EnvironmentCard({ state }: { state: EnvironmentState }) {
  return (
    <div className="rounded-lg border border-gray-700/30 bg-gray-800/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ring-1 ring-inset ${envColor(state.env)}`}
        >
          {state.env}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${healthDot(state.health)}`} />
          <span className="text-xs text-gray-500">{state.health}</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-white">{state.currentVersion}</p>
      <p className="mb-2 font-mono text-xs text-gray-600">{state.imageTag}</p>
      <div className="space-y-0.5 text-xs text-gray-500">
        <div>
          Tasks: <span className="text-gray-400">{state.taskCount}</span>
        </div>
        <div>
          Deployed: <span className="text-gray-400">{timeAgo(state.deployedAt)}</span>
        </div>
        <div className="truncate">
          By: <span className="text-gray-400">{state.deployedBy}</span>
        </div>
      </div>
    </div>
  );
}

function PipelineStageVisualization({ pipeline }: { pipeline: DeployPipeline }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {pipeline.stages.map((stage, i) => (
        <Fragment key={stage.name}>
          {i > 0 && <ArrowRight size={10} className="hidden shrink-0 text-gray-700 sm:block" />}
          <div
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${statusBadgeColor(stage.status)}`}
            title={stage.notes ?? stage.name}
          >
            <span className="shrink-0">{statusIcon(stage.status)}</span>
            <span className="hidden truncate sm:inline">{stage.name}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function PipelineRow({
  pipeline,
  isExpanded,
  onToggle,
}: {
  pipeline: DeployPipeline;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const completedStages = pipeline.stages.filter(
    (s) => s.status === "COMPLETED" || s.status === "APPROVED",
  ).length;
  const progressPct = Math.round((completedStages / pipeline.stages.length) * 100);

  return (
    <div className="border-b border-gray-700/30">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown size={14} className="shrink-0 text-gray-500" />
            ) : (
              <ChevronRight size={14} className="shrink-0 text-gray-500" />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-white">{pipeline.service}</span>
                <span className="font-mono text-xs text-gray-400">{pipeline.version}</span>
                <ArrowRight size={12} className="text-gray-600" />
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ring-1 ring-inset ${envColor(pipeline.currentEnv)}`}
                >
                  {pipeline.currentEnv}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-600">
                {pipeline.triggeredBy} · {timeAgo(pipeline.triggeredAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${strategyBadge(pipeline.strategy)}`}
            >
              {pipeline.strategy}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeColor(pipeline.status)}`}
            >
              {statusIcon(pipeline.status)}
              {pipeline.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700">
            <div
              className={`h-full rounded-full transition-all ${
                pipeline.status === "FAILED" || pipeline.status === "ROLLED_BACK"
                  ? "bg-red-500"
                  : pipeline.status === "COMPLETED"
                    ? "bg-emerald-500"
                    : "bg-blue-500"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-gray-500">{progressPct}%</span>
        </div>

        {/* Stage visualization (compact) */}
        <PipelineStageVisualization pipeline={pipeline} />
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="space-y-4 border-t border-gray-700/20 bg-gray-900/40 px-4 py-4">
          {/* Stages detail */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Stages</h4>
            {pipeline.stages.map((stage) => (
              <div
                key={stage.name}
                className="flex flex-wrap items-start gap-3 rounded-lg bg-gray-800/30 px-3 py-2 text-xs"
              >
                <span className={`mt-0.5 shrink-0 ${statusColor(stage.status)}`}>
                  {statusIcon(stage.status)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-300">{stage.name}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-xs ring-1 ring-inset ${statusBadgeColor(stage.status)}`}
                    >
                      {stage.status.replace("_", " ")}
                    </span>
                    {stage.approver && (
                      <span className="text-xs text-gray-600">by {stage.approver}</span>
                    )}
                  </div>
                  {stage.notes && <p className="mt-0.5 text-xs text-gray-500">{stage.notes}</p>}
                  {stage.startedAt && (
                    <p className="mt-0.5 text-xs text-gray-600">
                      {formatDate(stage.startedAt)}
                      {stage.completedAt && ` → ${formatDate(stage.completedAt)}`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Health checks */}
          {pipeline.healthChecks.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Health Checks
              </h4>
              <div className="flex flex-wrap gap-2">
                {pipeline.healthChecks.map((hc) => (
                  <div
                    key={hc.name}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                      hc.status === "PASSING"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : hc.status === "FAILING"
                          ? "border-red-500/20 bg-red-500/5"
                          : "border-gray-700/30 bg-gray-800/30"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        hc.status === "PASSING"
                          ? "bg-emerald-400"
                          : hc.status === "FAILING"
                            ? "bg-red-400"
                            : "bg-gray-500"
                      }`}
                    />
                    <span className="text-gray-300">{hc.name}</span>
                    <span className="font-mono text-xs text-gray-600">{hc.endpoint}</span>
                    {hc.responseTime !== null && (
                      <span className="text-xs text-gray-500">{hc.responseTime}ms</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Circuit breaker */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Shield
                size={12}
                className={pipeline.circuitBreaker.triggered ? "text-red-400" : "text-gray-500"}
              />
              <span className="text-gray-500">Circuit Breaker:</span>
              {pipeline.circuitBreaker.triggered ? (
                <span className="font-medium text-red-400">TRIGGERED</span>
              ) : (
                <span className="text-gray-400">
                  {pipeline.circuitBreaker.failureCount}/{pipeline.circuitBreaker.threshold}{" "}
                  failures
                </span>
              )}
            </div>
            {pipeline.rollbackVersion && (
              <div className="flex items-center gap-1 text-gray-500">
                <RotateCcw size={10} />
                <span>
                  Rollback target:{" "}
                  <span className="font-mono text-gray-400">{pipeline.rollbackVersion}</span>
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {pipeline.status === "PENDING_APPROVAL" && (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                <CheckCircle2 size={12} />
                Approve
              </button>
            )}
            {(pipeline.status === "IN_PROGRESS" ||
              pipeline.status === "HEALTH_CHECK" ||
              pipeline.status === "PENDING_APPROVAL") && (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/30"
              >
                <RotateCcw size={12} />
                Rollback
              </button>
            )}
            {pipeline.status === "FAILED" && (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Play size={12} />
                Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

type TabId = "pipelines" | "environments" | "schedules" | "rollbacks";

export function DeploymentsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("pipelines");
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  const services = [...new Set(deployPipelines.map((p) => p.service))];
  const filteredPipelines =
    serviceFilter === "all"
      ? deployPipelines
      : deployPipelines.filter((p) => p.service === serviceFilter);

  const activeDeploys = deployPipelines.filter(
    (p) =>
      p.status === "IN_PROGRESS" || p.status === "HEALTH_CHECK" || p.status === "PENDING_APPROVAL",
  ).length;
  const failedDeploys = deployPipelines.filter(
    (p) => p.status === "FAILED" || p.status === "ROLLED_BACK",
  ).length;
  const completedDeploys = deployPipelines.filter((p) => p.status === "COMPLETED").length;

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "pipelines", label: "Pipelines", count: deployPipelines.length },
    { id: "environments", label: "Environments" },
    {
      id: "schedules",
      label: "Scheduled",
      count: deploySchedules.filter((s) => s.status === "SCHEDULED").length,
    },
    { id: "rollbacks", label: "Rollbacks", count: deployRollbacks.length },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Active Deployments"
          value={activeDeploys}
          icon={<Rocket size={22} />}
          color="blue"
          subtitle={`${deployPipelines.length} total pipelines`}
        />
        <StatCard
          title="Completed"
          value={completedDeploys}
          icon={<CheckCircle2 size={22} />}
          color="green"
          subtitle="Successfully deployed"
        />
        <StatCard
          title="Failed / Rolled Back"
          value={failedDeploys}
          icon={<AlertTriangle size={22} />}
          color={failedDeploys > 0 ? "red" : "green"}
          subtitle={`${deployRollbacks.length} rollbacks total`}
        />
        <StatCard
          title="Scheduled"
          value={deploySchedules.filter((s) => s.status === "SCHEDULED").length}
          icon={<Calendar size={22} />}
          color="purple"
          subtitle="Upcoming deployments"
        />
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-700/30 px-4 pt-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="rounded-full bg-gray-700/50 px-1.5 py-0.5 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pipelines tab */}
        {activeTab === "pipelines" && (
          <div>
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-700/20 px-4 py-3">
              <span className="text-xs text-gray-500">Service:</span>
              <button
                type="button"
                onClick={() => setServiceFilter("all")}
                className={`rounded-lg px-2 py-1 text-xs font-medium ${
                  serviceFilter === "all"
                    ? "bg-gray-600 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                All
              </button>
              {services.map((svc) => (
                <button
                  key={svc}
                  type="button"
                  onClick={() => setServiceFilter(svc)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium ${
                    serviceFilter === svc
                      ? "bg-gray-600 text-white"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {svc}
                </button>
              ))}
            </div>
            {filteredPipelines.length === 0 ? (
              <p className="py-12 text-center text-xs text-gray-600">No pipelines match filter.</p>
            ) : (
              filteredPipelines.map((pipeline) => (
                <PipelineRow
                  key={pipeline.id}
                  pipeline={pipeline}
                  isExpanded={expandedPipeline === pipeline.id}
                  onToggle={() =>
                    setExpandedPipeline(expandedPipeline === pipeline.id ? null : pipeline.id)
                  }
                />
              ))
            )}
          </div>
        )}

        {/* Environments tab */}
        {activeTab === "environments" && (
          <div className="p-4">
            {/* Group by service */}
            {[...new Set(environmentStates.map((e) => e.service))].map((service) => {
              const envs = environmentStates.filter((e) => e.service === service);
              return (
                <div key={service} className="mb-6 last:mb-0">
                  <div className="mb-3 flex items-center gap-2">
                    <GitBranch size={14} className="text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">{service}</h3>
                  </div>
                  {/* Promotion flow */}
                  <div className="flex flex-wrap items-center gap-2">
                    {(["dev", "staging", "prod"] as const).map((env, i) => {
                      const state = envs.find((e) => e.env === env);
                      return (
                        <Fragment key={env}>
                          {i > 0 && (
                            <div className="flex flex-col items-center">
                              <ArrowRight size={16} className="text-gray-600" />
                              <button
                                type="button"
                                className="mt-1 rounded bg-gray-700/50 px-1.5 py-0.5 text-[9px] text-gray-500 hover:bg-gray-700 hover:text-gray-300"
                              >
                                Promote
                              </button>
                            </div>
                          )}
                          <div className="w-48 shrink-0 sm:w-56">
                            {state ? (
                              <EnvironmentCard state={state} />
                            ) : (
                              <div className="rounded-lg border border-dashed border-gray-700/30 p-3 text-center text-xs text-gray-600">
                                Not deployed
                              </div>
                            )}
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Schedules tab */}
        {activeTab === "schedules" && (
          <div className="p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Scheduled Deployments</h3>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Calendar size={12} />
                Schedule Deploy
              </button>
            </div>
            <div className="space-y-2">
              {deploySchedules.map((sched) => (
                <ScheduleRow key={sched.id} schedule={sched} />
              ))}
            </div>
          </div>
        )}

        {/* Rollbacks tab */}
        {activeTab === "rollbacks" && (
          <div className="p-4">
            <h3 className="mb-4 text-sm font-semibold text-white">Rollback History</h3>
            <div className="space-y-3">
              {deployRollbacks.map((rb) => (
                <div
                  key={rb.id}
                  className="rounded-lg border border-gray-700/30 bg-gray-900/30 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <RotateCcw size={14} className="text-orange-400" />
                    <span className="text-sm font-medium text-white">{rb.service}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ring-1 ring-inset ${envColor(rb.env)}`}
                    >
                      {rb.env}
                    </span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        rb.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                          : rb.status === "IN_PROGRESS"
                            ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
                            : "bg-red-500/10 text-red-400 ring-red-500/20"
                      }`}
                    >
                      {rb.status}
                    </span>
                  </div>
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <span className="font-mono text-red-400 line-through">{rb.fromVersion}</span>
                    <ArrowRight size={10} className="text-gray-600" />
                    <span className="font-mono text-emerald-400">{rb.toVersion}</span>
                  </div>
                  <p className="mb-1 text-xs text-gray-400">{rb.reason}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>By: {rb.initiatedBy}</span>
                    <span>{formatDate(rb.initiatedAt)}</span>
                    {rb.completedAt && <span>Took: {timeAgo(rb.completedAt)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Schedule Row ──────────────────────────────────────────

function ScheduleRow({ schedule }: { schedule: DeploySchedule }) {
  const isPast = new Date(schedule.scheduledFor) < new Date();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-700/30 bg-gray-900/30 px-4 py-3">
      <Calendar
        size={16}
        className={
          schedule.status === "COMPLETED"
            ? "text-emerald-400"
            : isPast
              ? "text-yellow-400"
              : "text-blue-400"
        }
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-white">{schedule.service}</span>
          <span className="font-mono text-xs text-gray-400">{schedule.version}</span>
          <ArrowRight size={10} className="text-gray-600" />
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ring-1 ring-inset ${envColor(schedule.targetEnv)}`}
          >
            {schedule.targetEnv}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-gray-500">
          <span>{formatDate(schedule.scheduledFor)}</span>
          <span>Window: {schedule.maintenanceWindow}</span>
          <span>By: {schedule.createdBy}</span>
        </div>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
          schedule.status === "SCHEDULED"
            ? "bg-blue-500/10 text-blue-400 ring-blue-500/20"
            : schedule.status === "COMPLETED"
              ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
              : "bg-gray-500/10 text-gray-500 ring-gray-500/20"
        }`}
      >
        {schedule.status}
      </span>
      {schedule.status === "SCHEDULED" && (
        <button
          type="button"
          className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
          aria-label="Cancel schedule"
        >
          <XCircle size={14} />
        </button>
      )}
    </div>
  );
}
