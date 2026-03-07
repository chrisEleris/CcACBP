import type { JenkinsJob, JenkinsServerInfo } from "@shared/types";
import { CheckCircle2, Clock, ListOrdered, Workflow } from "lucide-react";
import { StatCard } from "../../components/StatCard";
import { formatDuration } from "./jenkins-helpers";

type JenkinsStatsProps = {
  jobs: JenkinsJob[];
  server: JenkinsServerInfo;
};

export function JenkinsStats({ jobs, server }: JenkinsStatsProps) {
  const totalPipelines = jobs.length;
  const successCount = jobs.filter((j) => j.lastBuild?.status === "SUCCESS").length;
  const successRate = totalPipelines > 0 ? Math.round((successCount / totalPipelines) * 100) : 0;
  const avgDurationMs =
    jobs
      .filter((j) => j.lastBuild !== null)
      .reduce((acc, j) => acc + (j.lastBuild?.durationMs ?? 0), 0) /
    (jobs.filter((j) => j.lastBuild !== null).length || 1);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        title="Total Pipelines"
        value={totalPipelines}
        icon={<Workflow size={22} />}
        color="blue"
        subtitle={`${jobs.filter((j) => j.enabled).length} enabled`}
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
        value={server.queueLength}
        icon={<ListOrdered size={22} />}
        color={server.queueLength > 0 ? "orange" : "blue"}
        subtitle={
          server.queueLength > 0
            ? `${server.executorsBusy}/${server.executorsTotal} executors busy`
            : "All executors free"
        }
      />
    </div>
  );
}
