import type {
  DeployConfig,
  DeployParameter,
  JenkinsBuild,
  JenkinsBuildStatus,
  JenkinsJob,
  JenkinsQueueItem,
} from "@shared/types";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  ExternalLink,
  History,
  ListOrdered,
  Loader2,
  Play,
  Plus,
  Rocket,
  Server,
  Settings,
  Trash2,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { Fragment, useState } from "react";
import { DataTable } from "../components/DataTable";
import { StatCard } from "../components/StatCard";
import {
  deployConfigs,
  jenkinsBuildHistory,
  jenkinsJobs,
  jenkinsQueue,
  jenkinsServer,
} from "../lib/mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms === 0) return "-";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function timeAgo(timestamp: string): string {
  const now = new Date("2026-03-01T11:00:00Z").getTime();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type StatusBadgeProps = { status: JenkinsBuildStatus; small?: boolean };

const statusStyles: Record<JenkinsBuildStatus, string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  FAILURE: "bg-red-500/10 text-red-400 ring-red-500/20",
  UNSTABLE: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
  ABORTED: "bg-gray-500/10 text-gray-400 ring-gray-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  QUEUED: "bg-gray-500/10 text-gray-300 ring-gray-500/20",
};

const statusDotColors: Record<JenkinsBuildStatus, string> = {
  SUCCESS: "bg-emerald-400",
  FAILURE: "bg-red-400",
  UNSTABLE: "bg-yellow-400",
  ABORTED: "bg-gray-400",
  IN_PROGRESS: "bg-blue-400 animate-pulse",
  QUEUED: "bg-gray-300",
};

function StatusBadge({ status, small = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-medium ${
        small ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-xs"
      } ${statusStyles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotColors[status]}`} />
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Stage box colors ─────────────────────────────────────────────────────────

const stageBoxStyles: Record<JenkinsBuildStatus, string> = {
  SUCCESS: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  FAILURE: "bg-red-500/15 border-red-500/40 text-red-300",
  UNSTABLE: "bg-yellow-500/15 border-yellow-500/40 text-yellow-300",
  ABORTED: "bg-gray-500/10 border-gray-600/40 text-gray-500",
  IN_PROGRESS: "bg-blue-500/15 border-blue-500/40 text-blue-300 animate-pulse",
  QUEUED: "bg-gray-500/10 border-gray-600/40 text-gray-400",
};

// ─── Job type badge ───────────────────────────────────────────────────────────

const jobTypeStyles: Record<JenkinsJob["type"], string> = {
  pipeline: "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  multibranch: "bg-purple-500/15 text-purple-400 ring-purple-500/25",
  freestyle: "bg-gray-500/15 text-gray-400 ring-gray-500/25",
};

function JobTypeBadge({ type }: { type: JenkinsJob["type"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${jobTypeStyles[type]}`}
    >
      {type}
    </span>
  );
}

// ─── Environment badge ────────────────────────────────────────────────────────

const envStyles: Record<DeployConfig["targetEnv"], string> = {
  dev: "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  staging: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/25",
  prod: "bg-red-500/15 text-red-400 ring-red-500/25",
};

function EnvBadge({ env }: { env: DeployConfig["targetEnv"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${envStyles[env]}`}
    >
      {env}
    </span>
  );
}

// ─── Strategy badge ───────────────────────────────────────────────────────────

const strategyStyles: Record<DeployConfig["deployStrategy"], string> = {
  rolling: "bg-blue-500/10 text-blue-300",
  "blue-green": "bg-teal-500/10 text-teal-300",
  canary: "bg-purple-500/10 text-purple-300",
};

function StrategyBadge({ strategy }: { strategy: DeployConfig["deployStrategy"] }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${strategyStyles[strategy]}`}>
      {strategy}
    </span>
  );
}

// ─── Health bar ───────────────────────────────────────────────────────────────

function HealthBar({ score }: { score: number }) {
  const color = score > 80 ? "bg-emerald-500" : score > 60 ? "bg-yellow-500" : "bg-red-500";
  const textColor =
    score > 80 ? "text-emerald-400" : score > 60 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`w-8 shrink-0 text-right text-xs tabular-nums font-medium ${textColor}`}>
        {score}%
      </span>
    </div>
  );
}

// ─── Stage pipeline visualization ─────────────────────────────────────────────

function StageVisualization({ stages }: { stages: JenkinsBuild["stages"] }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {stages.map((stage, idx) => (
        <div key={stage.name} className="flex items-center">
          <div
            className={`shrink-0 rounded border px-2 py-1 text-xs font-medium whitespace-nowrap ${stageBoxStyles[stage.status]}`}
            title={`${stage.name}: ${stage.status} (${formatDuration(stage.durationMs)})`}
          >
            {stage.name}
          </div>
          {idx < stages.length - 1 && <div className="h-px w-3 shrink-0 bg-gray-600" />}
        </div>
      ))}
    </div>
  );
}

// ─── Pipeline card ────────────────────────────────────────────────────────────

type PipelineCardProps = {
  job: JenkinsJob;
  onBuildNow: (jobName: string) => void;
  onViewHistory: (jobName: string) => void;
};

function PipelineCard({ job, onBuildNow, onViewHistory }: PipelineCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white text-sm truncate">{job.name}</span>
            <JobTypeBadge type={job.type} />
            {!job.enabled && (
              <span className="rounded-full bg-gray-600/30 px-2 py-0.5 text-xs text-gray-500">
                disabled
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{job.description}</p>
        </div>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
          title="Open in Jenkins"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Health */}
      <div>
        <p className="mb-1 text-xs text-gray-500">Health Score</p>
        <HealthBar score={job.healthScore} />
      </div>

      {/* Last build */}
      {job.lastBuild !== null ? (
        <div className="rounded-lg bg-gray-900/50 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Build #{job.lastBuild.number}</span>
              <StatusBadge status={job.lastBuild.status} small />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {formatDuration(job.lastBuild.durationMs)}
              </span>
              <span>{timeAgo(job.lastBuild.timestamp)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 truncate">{job.lastBuild.trigger}</p>
          <StageVisualization stages={job.lastBuild.stages} />
        </div>
      ) : (
        <div className="rounded-lg bg-gray-900/50 p-3 text-xs text-gray-600 text-center">
          No builds yet
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onBuildNow(job.name)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
        >
          <Play size={12} />
          Build Now
        </button>
        <button
          type="button"
          onClick={() => onViewHistory(job.name)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700/50 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300"
        >
          <History size={12} />
          History
        </button>
      </div>
    </div>
  );
}

// ─── Build History Table ──────────────────────────────────────────────────────

type BuildHistoryPanelProps = {
  jobName: string;
  builds: JenkinsBuild[];
  onClose: () => void;
};

function BuildHistoryPanel({ jobName, builds, onClose }: BuildHistoryPanelProps) {
  const [expandedBuild, setExpandedBuild] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <History size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-white">Build History</span>
          <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
            {jobName}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-gray-500 hover:bg-gray-700/50 hover:text-gray-300 transition-colors"
          aria-label="Close history"
        >
          <X size={16} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[600px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase">
                Build #
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase">
                Status
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase hidden sm:table-cell">
                Duration
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase hidden md:table-cell">
                Trigger
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase">
                Time
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium tracking-wider text-gray-400 uppercase">
                Stages
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/30">
            {builds.map((build) => (
              <Fragment key={build.number}>
                <tr
                  className="transition-colors hover:bg-white/[0.02] cursor-pointer"
                  onClick={() =>
                    setExpandedBuild(expandedBuild === build.number ? null : build.number)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedBuild(expandedBuild === build.number ? null : build.number);
                    }
                  }}
                >
                  <td className="px-4 py-3 text-gray-300">
                    <span className="font-mono text-xs font-medium text-white">
                      #{build.number}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <StatusBadge status={build.status} small />
                  </td>
                  <td className="px-4 py-3 text-gray-300 hidden sm:table-cell">
                    <span className="text-xs tabular-nums">{formatDuration(build.durationMs)}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 hidden md:table-cell">
                    <span className="text-xs text-gray-500 max-w-[180px] truncate block">
                      {build.trigger}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <span className="text-xs text-gray-500">{timeAgo(build.timestamp)}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <button
                      type="button"
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                      aria-label={
                        expandedBuild === build.number ? "Collapse stages" : "Expand stages"
                      }
                    >
                      {expandedBuild === build.number ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>
                  </td>
                </tr>
                {expandedBuild === build.number && (
                  <tr key={`${build.number}-stages`} className="bg-gray-900/30">
                    <td colSpan={6} className="px-4 py-3">
                      <StageVisualization stages={build.stages} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Server Status Bar ────────────────────────────────────────────────────────

function ServerStatusBar() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            jenkinsServer.connected ? "bg-emerald-400" : "bg-red-400"
          }`}
        />
        <span className="text-xs font-medium text-gray-300">
          {jenkinsServer.connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Server size={12} />
        <a
          href={jenkinsServer.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-gray-300 transition-colors truncate max-w-[200px]"
        >
          {jenkinsServer.url}
        </a>
      </div>
      <span className="text-xs text-gray-600">v{jenkinsServer.version}</span>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Workflow size={12} />
        <span>
          {jenkinsServer.executorsBusy}/{jenkinsServer.executorsTotal} executors busy
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <ListOrdered size={12} />
        <span>{jenkinsServer.queueLength} queued</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Server size={12} />
        <span>{jenkinsServer.nodeCount} nodes</span>
      </div>
      {!jenkinsServer.connected && (
        <button
          type="button"
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
        >
          <Settings size={12} />
          Configure Jenkins
        </button>
      )}
    </div>
  );
}

// ─── Queue panel ──────────────────────────────────────────────────────────────

function QueuePanel({ items }: { items: JenkinsQueueItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/10 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Clock size={14} className="text-yellow-400" />
        <span className="text-xs font-medium text-yellow-300">Build Queue ({items.length})</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-white">{item.jobName}</span>
              <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
              <span>~{formatDuration(item.estimatedDuration)}</span>
              <span>{timeAgo(item.inQueueSince)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Deployment Configs Section ───────────────────────────────────────────────

type DeployConfigCardProps = {
  config: DeployConfig;
  onDeploy: (id: string) => void;
  onEdit: (id: string) => void;
};

function DeployConfigCard({ config, onDeploy, onEdit }: DeployConfigCardProps) {
  const [showParams, setShowParams] = useState(false);

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4 space-y-3">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white text-sm">{config.name}</span>
            <EnvBadge env={config.targetEnv} />
            <StrategyBadge strategy={config.deployStrategy} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="font-mono">{config.targetService}</span>
            <span>{config.awsRegion}</span>
            <span className="font-mono text-gray-600">{config.jenkinsJob}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {config.autoApprove && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
              auto-approve
            </span>
          )}
        </div>
      </div>

      {/* Last deployed */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {config.lastDeployed !== null ? (
          <>
            <span className="text-gray-500">Last deployed: {timeAgo(config.lastDeployed)}</span>
            {config.lastStatus !== null && <StatusBadge status={config.lastStatus} small />}
          </>
        ) : (
          <span className="text-gray-600">Never deployed</span>
        )}
      </div>

      {/* Parameters */}
      {config.parameters.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowParams(!showParams)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showParams ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {config.parameters.length} parameter{config.parameters.length !== 1 ? "s" : ""}
          </button>
          {showParams && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {config.parameters.map((param) => (
                <span
                  key={param.name}
                  className="rounded border border-gray-700 bg-gray-900/50 px-2 py-1 text-xs text-gray-400"
                  title={`${param.description} — default: ${param.defaultValue}`}
                >
                  <span className="font-mono text-gray-300">{param.name}</span>
                  <span className="ml-1 text-gray-600">({param.type})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onDeploy(config.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          <Rocket size={12} />
          Deploy
        </button>
        <button
          type="button"
          onClick={() => onEdit(config.id)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700/50 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300"
        >
          <Edit2 size={12} />
          Edit
        </button>
      </div>
    </div>
  );
}

// ─── New Deploy Config Form ───────────────────────────────────────────────────

type NewConfigFormProps = {
  onCancel: () => void;
  onSave: (config: Omit<DeployConfig, "id" | "lastDeployed" | "lastStatus">) => void;
};

type FormParameter = {
  id: string;
  name: string;
  type: DeployParameter["type"];
  defaultValue: string;
  description: string;
};

function NewConfigForm({ onCancel, onSave }: NewConfigFormProps) {
  const [name, setName] = useState("");
  const [jenkinsJob, setJenkinsJob] = useState("");
  const [targetEnv, setTargetEnv] = useState<DeployConfig["targetEnv"]>("dev");
  const [targetService, setTargetService] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [deployStrategy, setDeployStrategy] = useState<DeployConfig["deployStrategy"]>("rolling");
  const [autoApprove, setAutoApprove] = useState(false);
  const [params, setParams] = useState<FormParameter[]>([]);

  function addParam() {
    setParams((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        type: "string",
        defaultValue: "",
        description: "",
      },
    ]);
  }

  function removeParam(id: string) {
    setParams((prev) => prev.filter((p) => p.id !== id));
  }

  function updateParam(id: string, field: keyof FormParameter, value: string) {
    setParams((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function handleSave() {
    if (!name.trim() || !jenkinsJob.trim() || !targetService.trim()) return;
    onSave({
      name: name.trim(),
      jenkinsJob: jenkinsJob.trim(),
      targetEnv,
      targetService: targetService.trim(),
      awsRegion,
      deployStrategy,
      autoApprove,
      parameters: params.map((p) => ({
        name: p.name,
        type: p.type,
        defaultValue: p.defaultValue,
        description: p.description,
      })),
    });
  }

  const inputClass =
    "w-full rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/30";
  const labelClass = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <div className="rounded-xl border border-blue-500/20 bg-gray-800/80 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plus size={16} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-white">New Deployment Configuration</h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1 text-gray-500 hover:bg-gray-700/50 hover:text-gray-300 transition-colors"
          aria-label="Close form"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main fields — 2 col on desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="config-name">
            Configuration Name *
          </label>
          <input
            id="config-name"
            type="text"
            className={inputClass}
            placeholder="e.g. Web Frontend (Prod)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="jenkins-job">
            Jenkins Job *
          </label>
          <select
            id="jenkins-job"
            className={inputClass}
            value={jenkinsJob}
            onChange={(e) => setJenkinsJob(e.target.value)}
          >
            <option value="">Select a job...</option>
            {jenkinsJobs.map((j) => (
              <option key={j.name} value={j.name}>
                {j.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="target-service">
            Target Service *
          </label>
          <input
            id="target-service"
            type="text"
            className={inputClass}
            placeholder="e.g. web-frontend, all-functions"
            value={targetService}
            onChange={(e) => setTargetService(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="aws-region">
            AWS Region
          </label>
          <select
            id="aws-region"
            className={inputClass}
            value={awsRegion}
            onChange={(e) => setAwsRegion(e.target.value)}
          >
            {[
              "us-east-1",
              "us-east-2",
              "us-west-1",
              "us-west-2",
              "eu-west-1",
              "eu-central-1",
              "ap-southeast-1",
            ].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target environment */}
      <div>
        <p className={labelClass}>Target Environment</p>
        <div className="flex flex-wrap gap-2">
          {(["dev", "staging", "prod"] as DeployConfig["targetEnv"][]).map((env) => (
            <label key={env} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="target-env"
                value={env}
                checked={targetEnv === env}
                onChange={() => setTargetEnv(env)}
                className="accent-blue-500"
              />
              <span className="text-sm text-gray-300">{env}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Deploy strategy */}
      <div>
        <p className={labelClass}>Deployment Strategy</p>
        <div className="flex flex-wrap gap-2">
          {(["rolling", "blue-green", "canary"] as DeployConfig["deployStrategy"][]).map(
            (strategy) => (
              <label key={strategy} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="deploy-strategy"
                  value={strategy}
                  checked={deployStrategy === strategy}
                  onChange={() => setDeployStrategy(strategy)}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-300">{strategy}</span>
              </label>
            ),
          )}
        </div>
      </div>

      {/* Auto-approve toggle */}
      <div className="flex items-center gap-3">
        <label htmlFor="auto-approve" className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input
              id="auto-approve"
              type="checkbox"
              className="sr-only"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
            />
            <div
              className={`h-5 w-9 rounded-full transition-colors ${
                autoApprove ? "bg-blue-500" : "bg-gray-700"
              }`}
            />
            <div
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                autoApprove ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </div>
          <span className="text-sm text-gray-300">Auto-approve deployments</span>
        </label>
      </div>

      {/* Parameters */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className={labelClass}>Parameters</p>
          <button
            type="button"
            onClick={addParam}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus size={12} />
            Add Parameter
          </button>
        </div>
        {params.length === 0 && (
          <p className="text-xs text-gray-600">No parameters — click "Add Parameter" to add one.</p>
        )}
        <div className="space-y-3">
          {params.map((param) => (
            <div
              key={param.id}
              className="grid grid-cols-1 gap-2 rounded-lg border border-gray-700/50 bg-gray-900/40 p-3 sm:grid-cols-2"
            >
              <input
                type="text"
                className={inputClass}
                placeholder="Parameter name"
                value={param.name}
                onChange={(e) => updateParam(param.id, "name", e.target.value)}
              />
              <div className="flex gap-2">
                <select
                  className={`${inputClass} flex-1`}
                  value={param.type}
                  onChange={(e) =>
                    updateParam(param.id, "type", e.target.value as DeployParameter["type"])
                  }
                >
                  <option value="string">string</option>
                  <option value="choice">choice</option>
                  <option value="boolean">boolean</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeParam(param.id)}
                  className="rounded-lg border border-gray-700 px-2 text-gray-500 hover:border-red-500/50 hover:text-red-400 transition-colors"
                  aria-label="Remove parameter"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <input
                type="text"
                className={inputClass}
                placeholder="Default value"
                value={param.defaultValue}
                onChange={(e) => updateParam(param.id, "defaultValue", e.target.value)}
              />
              <input
                type="text"
                className={inputClass}
                placeholder="Description"
                value={param.description}
                onChange={(e) => updateParam(param.id, "description", e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Form actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-700/50 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || !jenkinsJob.trim() || !targetService.trim()}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle2 size={14} />
          Save Configuration
        </button>
      </div>
    </div>
  );
}

// ─── Notification toast ───────────────────────────────────────────────────────

type ToastProps = { message: string; onDismiss: () => void };

function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-gray-900 px-4 py-3 shadow-xl">
      <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
      <span className="text-sm text-white">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function JenkinsPage() {
  const [historyJobName, setHistoryJobName] = useState<string | null>(null);
  const [showNewConfigForm, setShowNewConfigForm] = useState(false);
  const [configs, setConfigs] = useState<DeployConfig[]>(deployConfigs);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function handleBuildNow(jobName: string) {
    showToast(`Build triggered for ${jobName}`);
  }

  function handleViewHistory(jobName: string) {
    setHistoryJobName((prev) => (prev === jobName ? null : jobName));
  }

  function handleDeploy(id: string) {
    const config = configs.find((c) => c.id === id);
    if (config) showToast(`Deployment triggered: ${config.name}`);
  }

  function handleEdit(id: string) {
    const config = configs.find((c) => c.id === id);
    if (config) showToast(`Edit for ${config.name} — connect Jenkins to enable editing`);
  }

  function handleSaveConfig(newConfig: Omit<DeployConfig, "id" | "lastDeployed" | "lastStatus">) {
    const config: DeployConfig = {
      ...newConfig,
      id: `dc-${Date.now()}`,
      lastDeployed: null,
      lastStatus: null,
    };
    setConfigs((prev) => [...prev, config]);
    setShowNewConfigForm(false);
    showToast(`Configuration "${newConfig.name}" saved`);
  }

  // Stat calculations
  const totalPipelines = jenkinsJobs.length;
  const successCount = jenkinsJobs.filter((j) => j.lastBuild?.status === "SUCCESS").length;
  const successRate = totalPipelines > 0 ? Math.round((successCount / totalPipelines) * 100) : 0;
  const avgDurationMs =
    jenkinsJobs
      .filter((j) => j.lastBuild !== null)
      .reduce((acc, j) => acc + (j.lastBuild?.durationMs ?? 0), 0) /
    (jenkinsJobs.filter((j) => j.lastBuild !== null).length || 1);

  const buildHistoryForJob = historyJobName !== null ? jenkinsBuildHistory : [];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast !== null && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {/* Server Status Bar */}
      <ServerStatusBar />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Pipelines"
          value={totalPipelines}
          icon={<Workflow size={22} />}
          color="blue"
          subtitle={`${jenkinsJobs.filter((j) => j.enabled).length} enabled`}
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={<CheckCircle2 size={22} />}
          color="green"
          subtitle="of last builds"
        />
        <StatCard
          title="Avg Build Time"
          value={formatDuration(avgDurationMs)}
          icon={<Clock size={22} />}
          color="orange"
          subtitle="across all pipelines"
        />
        <StatCard
          title="Queue Depth"
          value={jenkinsServer.queueLength}
          icon={<ListOrdered size={22} />}
          color={jenkinsServer.queueLength > 0 ? "orange" : "blue"}
          subtitle={
            jenkinsServer.queueLength > 0
              ? `${jenkinsServer.executorsBusy}/${jenkinsServer.executorsTotal} executors busy`
              : "All executors free"
          }
        />
      </div>

      {/* Queue items */}
      <QueuePanel items={jenkinsQueue} />

      {/* Pipeline Status Section */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Workflow size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-300">Pipeline Status</h2>
          <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
            {jenkinsJobs.length}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {jenkinsJobs.map((job) => (
            <PipelineCard
              key={job.name}
              job={job}
              onBuildNow={handleBuildNow}
              onViewHistory={handleViewHistory}
            />
          ))}
        </div>
      </div>

      {/* Build History Panel */}
      {historyJobName !== null && (
        <BuildHistoryPanel
          jobName={historyJobName}
          builds={buildHistoryForJob}
          onClose={() => setHistoryJobName(null)}
        />
      )}

      {/* Deployment Configurations Section */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Rocket size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-gray-300">Deployment Configs</h2>
            <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
              {configs.length}
            </span>
          </div>
          {!showNewConfigForm && (
            <button
              type="button"
              onClick={() => setShowNewConfigForm(true)}
              className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
            >
              <Plus size={14} />
              New Config
            </button>
          )}
        </div>

        {showNewConfigForm && (
          <div className="mb-4">
            <NewConfigForm onCancel={() => setShowNewConfigForm(false)} onSave={handleSaveConfig} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {configs.map((config) => (
            <DeployConfigCard
              key={config.id}
              config={config}
              onDeploy={handleDeploy}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </div>

      {/* Deploy History Table (for all configs) */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <History size={16} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-gray-300">Recent Deployments</h2>
        </div>
        <DataTable<DeployConfig>
          data={configs.filter((c) => c.lastDeployed !== null)}
          keyExtractor={(c) => c.id}
          columns={[
            {
              key: "name",
              header: "Config",
              render: (c) => <span className="text-sm font-medium text-white">{c.name}</span>,
            },
            {
              key: "env",
              header: "Env",
              render: (c) => <EnvBadge env={c.targetEnv} />,
            },
            {
              key: "service",
              header: "Service",
              render: (c) => (
                <span className="font-mono text-xs text-gray-400">{c.targetService}</span>
              ),
              className: "hidden sm:table-cell",
            },
            {
              key: "strategy",
              header: "Strategy",
              render: (c) => <StrategyBadge strategy={c.deployStrategy} />,
              className: "hidden md:table-cell",
            },
            {
              key: "status",
              header: "Last Status",
              render: (c) =>
                c.lastStatus !== null ? (
                  <StatusBadge status={c.lastStatus} small />
                ) : (
                  <span className="text-xs text-gray-600">—</span>
                ),
            },
            {
              key: "deployed",
              header: "Deployed",
              render: (c) => (
                <span className="text-xs text-gray-500">
                  {c.lastDeployed !== null ? timeAgo(c.lastDeployed) : "—"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              render: (c) => (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDeploy(c.id)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    title="Deploy"
                  >
                    <Rocket size={12} />
                    Deploy
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Empty state hint */}
      {!jenkinsServer.connected && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/10 p-5 text-center">
          <AlertTriangle size={24} className="mx-auto mb-2 text-yellow-400" />
          <p className="text-sm font-medium text-yellow-300">Jenkins server not connected</p>
          <p className="mt-1 text-xs text-gray-500">
            Configure your Jenkins server URL and credentials in Settings to fetch live data.
          </p>
          <button
            type="button"
            className="mt-3 flex items-center gap-1.5 mx-auto rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors"
          >
            <Settings size={12} />
            Go to Settings
          </button>
        </div>
      )}

      {/* Node info footer */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-700/50 bg-gray-800/30 px-4 py-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <Server size={12} />
          <span>{jenkinsServer.nodeCount} build nodes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={12} />
          <span>
            {jenkinsServer.executorsBusy} / {jenkinsServer.executorsTotal} executors busy
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Loader2 size={12} />
          <span>{jenkinsServer.queueLength} jobs queued</span>
        </div>
        <span className="ml-auto">Jenkins v{jenkinsServer.version}</span>
      </div>
    </div>
  );
}
