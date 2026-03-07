import type { JenkinsBuild } from "@shared/types";
import { ChevronDown, ChevronUp, History, X } from "lucide-react";
import { Fragment, useState } from "react";
import { StageVisualization, StatusBadge } from "./JenkinsJobsTable";
import { formatDuration, timeAgo } from "./jenkins-helpers";

type JenkinsBuildHistoryProps = {
  jobName: string;
  builds: JenkinsBuild[];
  onClose: () => void;
};

export function JenkinsBuildHistory({ jobName, builds, onClose }: JenkinsBuildHistoryProps) {
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
