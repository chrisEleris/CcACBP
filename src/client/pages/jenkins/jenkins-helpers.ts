import type { JenkinsBuildStatus, JenkinsJob } from "@shared/types";
import type { DeployConfig } from "@shared/types";

export { timeAgo } from "../../utils/time";

export function formatDuration(ms: number): string {
  if (ms === 0) return "-";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export const statusStyles: Record<JenkinsBuildStatus, string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  FAILURE: "bg-red-500/10 text-red-400 ring-red-500/20",
  UNSTABLE: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
  ABORTED: "bg-gray-500/10 text-gray-400 ring-gray-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  QUEUED: "bg-gray-500/10 text-gray-300 ring-gray-500/20",
};

export const statusDotColors: Record<JenkinsBuildStatus, string> = {
  SUCCESS: "bg-emerald-400",
  FAILURE: "bg-red-400",
  UNSTABLE: "bg-yellow-400",
  ABORTED: "bg-gray-400",
  IN_PROGRESS: "bg-blue-400 animate-pulse",
  QUEUED: "bg-gray-300",
};

export const stageBoxStyles: Record<JenkinsBuildStatus, string> = {
  SUCCESS: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  FAILURE: "bg-red-500/15 border-red-500/40 text-red-300",
  UNSTABLE: "bg-yellow-500/15 border-yellow-500/40 text-yellow-300",
  ABORTED: "bg-gray-500/10 border-gray-600/40 text-gray-500",
  IN_PROGRESS: "bg-blue-500/15 border-blue-500/40 text-blue-300 animate-pulse",
  QUEUED: "bg-gray-500/10 border-gray-600/40 text-gray-400",
};

export const jobTypeStyles: Record<JenkinsJob["type"], string> = {
  pipeline: "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  multibranch: "bg-purple-500/15 text-purple-400 ring-purple-500/25",
  freestyle: "bg-gray-500/15 text-gray-400 ring-gray-500/25",
};

export const envStyles: Record<DeployConfig["targetEnv"], string> = {
  dev: "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  staging: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/25",
  prod: "bg-red-500/15 text-red-400 ring-red-500/25",
};

export const strategyStyles: Record<DeployConfig["deployStrategy"], string> = {
  rolling: "bg-blue-500/10 text-blue-300",
  "blue-green": "bg-teal-500/10 text-teal-300",
  canary: "bg-purple-500/10 text-purple-300",
};
