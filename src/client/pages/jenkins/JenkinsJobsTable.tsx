import type { JenkinsBuild, JenkinsBuildStatus, JenkinsJob } from "@shared/types";
import { Clock, ExternalLink, History, Play } from "lucide-react";
import {
  formatDuration,
  jobTypeStyles,
  stageBoxStyles,
  statusDotColors,
  statusStyles,
  timeAgo,
} from "./jenkins-helpers";

// ─── Status badge ─────────────────────────────────────────────────────────────

type StatusBadgeProps = { status: JenkinsBuildStatus; small?: boolean };

export function StatusBadge({ status, small = false }: StatusBadgeProps) {
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

// ─── Job type badge ───────────────────────────────────────────────────────────

export function JobTypeBadge({ type }: { type: JenkinsJob["type"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${jobTypeStyles[type]}`}
    >
      {type}
    </span>
  );
}

// ─── Health bar ───────────────────────────────────────────────────────────────

export function HealthBar({ score }: { score: number }) {
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

export function StageVisualization({ stages }: { stages: JenkinsBuild["stages"] }) {
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

export function PipelineCard({ job, onBuildNow, onViewHistory }: PipelineCardProps) {
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
