import type { DeployConfig, DeployParameter } from "@shared/types";
import { CheckCircle2, ChevronDown, ChevronUp, Edit2, Plus, Rocket, Trash2, X } from "lucide-react";
import { useState } from "react";
import { jenkinsJobs } from "../../lib/mock-data";
import { StatusBadge } from "./JenkinsJobsTable";
import { envStyles, strategyStyles, timeAgo } from "./jenkins-helpers";

// ─── Environment badge ────────────────────────────────────────────────────────

export function EnvBadge({ env }: { env: DeployConfig["targetEnv"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${envStyles[env]}`}
    >
      {env}
    </span>
  );
}

// ─── Strategy badge ───────────────────────────────────────────────────────────

export function StrategyBadge({ strategy }: { strategy: DeployConfig["deployStrategy"] }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${strategyStyles[strategy]}`}>
      {strategy}
    </span>
  );
}

// ─── Deploy Config Card ───────────────────────────────────────────────────────

type DeployConfigCardProps = {
  config: DeployConfig;
  onDeploy: (id: string) => void;
  onEdit: (id: string) => void;
};

export function DeployConfigCard({ config, onDeploy, onEdit }: DeployConfigCardProps) {
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

export function NewConfigForm({ onCancel, onSave }: NewConfigFormProps) {
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
