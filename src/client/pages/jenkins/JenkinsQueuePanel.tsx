import type { JenkinsQueueItem } from "@shared/types";
import { Clock } from "lucide-react";
import { formatDuration, timeAgo } from "./jenkins-helpers";

type JenkinsQueuePanelProps = {
  items: JenkinsQueueItem[];
};

export function JenkinsQueuePanel({ items }: JenkinsQueuePanelProps) {
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
