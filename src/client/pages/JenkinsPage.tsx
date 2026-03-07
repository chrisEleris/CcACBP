import type { DeployConfig } from "@shared/types";
import { CheckCircle2, History, Plus, Rocket, Workflow, X } from "lucide-react";
import { useState } from "react";
import { DataTable } from "../components/DataTable";
import {
  deployConfigs,
  jenkinsBuildHistory,
  jenkinsJobs,
  jenkinsQueue,
  jenkinsServer,
} from "../lib/mock-data";
import { JenkinsBuildHistory } from "./jenkins/JenkinsBuildHistory";
import {
  DeployConfigCard,
  EnvBadge,
  NewConfigForm,
  StrategyBadge,
} from "./jenkins/JenkinsDeployConfigs";
import { PipelineCard, StatusBadge } from "./jenkins/JenkinsJobsTable";
import {
  JenkinsDisconnectedBanner,
  JenkinsNodeFooter,
  JenkinsServerStatusBar,
} from "./jenkins/JenkinsNodeStatus";
import { JenkinsQueuePanel } from "./jenkins/JenkinsQueuePanel";
import { JenkinsStats } from "./jenkins/JenkinsStats";
import { timeAgo } from "./jenkins/jenkins-helpers";

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

  const buildHistoryForJob = historyJobName !== null ? jenkinsBuildHistory : [];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast !== null && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {/* Server Status Bar */}
      <JenkinsServerStatusBar server={jenkinsServer} />

      {/* Stat Cards */}
      <JenkinsStats jobs={jenkinsJobs} server={jenkinsServer} />

      {/* Queue items */}
      <JenkinsQueuePanel items={jenkinsQueue} />

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
        <JenkinsBuildHistory
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
      <JenkinsDisconnectedBanner connected={jenkinsServer.connected} />

      {/* Node info footer */}
      <JenkinsNodeFooter server={jenkinsServer} />
    </div>
  );
}
