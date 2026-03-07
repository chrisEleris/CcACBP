import {
  Database,
  FileText,
  Globe,
  HardDrive,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useFetch } from "../lib/use-fetch";

type DataSourceStatus = "connected" | "disconnected" | "error";

type DataSourceType = "postgresql" | "mysql" | "sqlite" | "csv" | "api" | "s3";

type DataSource = {
  id: string;
  name: string;
  type: DataSourceType;
  status: DataSourceStatus;
  lastTested: string | null;
  config: string;
};

type CreateDataSourceForm = {
  name: string;
  type: DataSourceType;
  config: string;
};

const dataSourceTypeConfig: Record<DataSourceType, { label: string; icon: typeof Database }> = {
  postgresql: { label: "PostgreSQL", icon: Database },
  mysql: { label: "MySQL", icon: Database },
  sqlite: { label: "SQLite", icon: HardDrive },
  csv: { label: "CSV File", icon: FileText },
  api: { label: "REST API", icon: Globe },
  s3: { label: "Amazon S3", icon: Server },
};

const statusConfig: Record<DataSourceStatus, { label: string; className: string }> = {
  connected: {
    label: "Connected",
    className: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  },
  disconnected: {
    label: "Disconnected",
    className: "bg-gray-500/10 text-gray-400 ring-gray-500/20",
  },
  error: {
    label: "Error",
    className: "bg-red-500/10 text-red-400 ring-red-500/20",
  },
};

const DATA_SOURCE_TYPES: DataSourceType[] = ["postgresql", "mysql", "sqlite", "csv", "api", "s3"];

const DEFAULT_FORM: CreateDataSourceForm = {
  name: "",
  type: "postgresql",
  config: "",
};

export function DataSourcesPage() {
  const {
    data: dataSources,
    loading,
    error,
    refetch,
  } = useFetch<DataSource[]>("/api/data-sources");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<CreateDataSourceForm>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreate() {
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch("/api/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        throw new Error(`Failed to create: ${response.statusText}`);
      }
      setIsModalOpen(false);
      setForm(DEFAULT_FORM);
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create data source");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTestConnection(id: string) {
    setTestingId(id);
    try {
      await fetch(`/api/data-sources/${id}/test`, { method: "POST" });
      refetch();
    } catch {
      // silently handle, refetch will show updated status
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/data-sources/${id}`, { method: "DELETE" });
      refetch();
    } catch {
      // silently handle
    } finally {
      setDeletingId(null);
    }
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setForm(DEFAULT_FORM);
    setFormError(null);
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const sources = dataSources ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Data Sources</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {sources.length} source{sources.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Data Source
        </button>
      </div>

      {/* Grid */}
      {sources.length === 0 ? (
        <EmptyState message="No data sources configured. Add one to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sources.map((source) => {
            const typeConf = dataSourceTypeConfig[source.type];
            const statusConf = statusConfig[source.status];
            const Icon = typeConf.icon;

            return (
              <div
                key={source.id}
                className="flex flex-col rounded-xl border border-gray-700/50 bg-gray-800/50 p-5 backdrop-blur-sm"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 rounded-lg bg-gray-700/50 p-2.5">
                      <Icon size={20} className="text-gray-300" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{source.name}</p>
                      <p className="text-xs text-gray-500">{typeConf.label}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusConf.className}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {statusConf.label}
                  </span>
                </div>

                {/* Last tested */}
                <p className="mt-4 text-xs text-gray-500">
                  Last tested: <span className="text-gray-400">{source.lastTested ?? "Never"}</span>
                </p>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(source.id)}
                    disabled={testingId === source.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-600 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={13}
                      className={testingId === source.id ? "animate-spin" : ""}
                    />
                    {testingId === source.id ? "Testing..." : "Test Connection"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(source.id)}
                    disabled={deletingId === source.id}
                    className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    aria-label={`Delete ${source.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCloseModal}
            onKeyDown={() => undefined}
            role="presentation"
          />

          {/* Modal panel */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Add Data Source</h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="ds-name" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Name
                </label>
                <input
                  id="ds-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="My Database"
                  className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                />
              </div>

              {/* Type */}
              <div>
                <label htmlFor="ds-type" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Type
                </label>
                <select
                  id="ds-type"
                  value={form.type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, type: e.target.value as DataSourceType }))
                  }
                  className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-white ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                >
                  {DATA_SOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {dataSourceTypeConfig[t].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Config */}
              <div>
                <label
                  htmlFor="ds-config"
                  className="mb-1.5 block text-sm font-medium text-gray-300"
                >
                  Configuration (JSON)
                </label>
                <textarea
                  id="ds-config"
                  value={form.config}
                  onChange={(e) => setForm((prev) => ({ ...prev, config: e.target.value }))}
                  placeholder='{"host": "localhost", "port": 5432, "database": "mydb"}'
                  rows={5}
                  className="w-full resize-none rounded-lg bg-gray-800 px-3 py-2 font-mono text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                />
              </div>

              {formError && <p className="text-sm text-red-400">{formError}</p>}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Add Source
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
