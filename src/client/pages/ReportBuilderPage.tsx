import {
  BarChart2,
  Edit2,
  Eye,
  LineChart,
  PieChart,
  Play,
  Plus,
  Save,
  ScatterChart,
  Table,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useFetch } from "../lib/use-fetch";

type VisualizationType = "table" | "bar" | "line" | "pie" | "area" | "scatter";

type DataSource = {
  id: string;
  name: string;
  type: string;
};

type Report = {
  id: string;
  name: string;
  description: string;
  query: string;
  dataSourceId: string | null;
  visualization: VisualizationType;
  chartConfig: string;
  layout: string;
  parameters: string;
  createdAt: string;
  updatedAt: string;
};

type ReportFormState = {
  name: string;
  description: string;
  query: string;
  dataSourceId: string;
  visualization: VisualizationType;
};

type PreviewResultRow = Record<string, string | number | boolean | null>;

type PreviewResult = {
  columns: string[];
  rows: PreviewResultRow[];
};

const DEFAULT_FORM: ReportFormState = {
  name: "",
  description: "",
  query: "SELECT * FROM users LIMIT 100;",
  dataSourceId: "",
  visualization: "table",
};

const vizOptions: { type: VisualizationType; label: string; icon: typeof Table }[] = [
  { type: "table", label: "Table", icon: Table },
  { type: "bar", label: "Bar", icon: BarChart2 },
  { type: "line", label: "Line", icon: LineChart },
  { type: "pie", label: "Pie", icon: PieChart },
  { type: "area", label: "Area", icon: TrendingUp },
  { type: "scatter", label: "Scatter", icon: ScatterChart },
];

export function ReportBuilderPage() {
  const {
    data: reports,
    loading: reportsLoading,
    error: reportsError,
    refetch: refetchReports,
  } = useFetch<Report[]>("/api/reports");
  const { data: dataSources, loading: dsLoading } = useFetch<DataSource[]>("/api/data-sources");

  const [form, setForm] = useState<ReportFormState>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleFormChange<K extends keyof ReportFormState>(key: K, value: ReportFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setPreviewResult(null);
    setPreviewError(null);
  }

  async function handlePreview() {
    if (!form.query.trim()) return;
    setIsPreviewing(true);
    setPreviewError(null);
    setPreviewResult(null);
    try {
      const response = await fetch("/api/query/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: form.query, dataSourceId: form.dataSourceId || null }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? `Preview failed: ${response.statusText}`);
      }
      const body = (await response.json()) as { data: PreviewResult };
      setPreviewResult(body.data);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setSaveError("Report name is required");
      return;
    }
    if (!form.query.trim()) {
      setSaveError("SQL query is required");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const method = editingId ? "PUT" : "POST";
      const path = editingId ? `/api/reports/${editingId}` : "/api/reports";
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          query: form.query,
          visualization: form.visualization,
          dataSourceId: form.dataSourceId || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to save: ${response.statusText}`);
      }
      setForm(DEFAULT_FORM);
      setEditingId(null);
      setPreviewResult(null);
      refetchReports();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save report");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(report: Report) {
    setEditingId(report.id);
    setForm({
      name: report.name,
      description: report.description,
      query: report.query,
      dataSourceId: report.dataSourceId ?? "",
      visualization: report.visualization,
    });
    setPreviewResult(null);
    setPreviewError(null);
    setSaveError(null);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setPreviewResult(null);
    setPreviewError(null);
    setSaveError(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.statusText}`);
      }
      refetchReports();
    } catch (err) {
      console.error("Operation failed:", err);
      setDeleteError("Failed to delete. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const savedReports = reports ?? [];
  const sources = dataSources ?? [];

  // Attach a stable row key so DataTable's keyExtractor can function without index arg
  type IndexedRow = PreviewResultRow & { _rowKey: string };
  const indexedPreviewRows: IndexedRow[] = previewResult
    ? previewResult.rows.map((row, idx) => ({ ...row, _rowKey: String(idx) }))
    : [];

  const previewColumns = previewResult
    ? previewResult.columns.map((col) => ({
        key: col,
        header: col,
        render: (row: IndexedRow) =>
          row[col] === null ? (
            <span className="text-gray-600">NULL</span>
          ) : (
            <span className="font-mono text-xs">{String(row[col])}</span>
          ),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Builder form */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            {editingId ? "Edit Report" : "Create Report"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-white"
            >
              <X size={14} />
              Cancel
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Name */}
          <div>
            <label htmlFor="report-name" className="mb-1.5 block text-sm font-medium text-gray-300">
              Report Name <span className="text-red-400">*</span>
            </label>
            <input
              id="report-name"
              type="text"
              value={form.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              placeholder="Monthly Cost Summary"
              className="w-full rounded-lg bg-gray-900/60 px-3 py-2 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
            />
          </div>

          {/* Data source */}
          <div>
            <label
              htmlFor="report-datasource"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              Data Source
            </label>
            <select
              id="report-datasource"
              value={form.dataSourceId}
              onChange={(e) => handleFormChange("dataSourceId", e.target.value)}
              disabled={dsLoading}
              className="w-full rounded-lg bg-gray-900/60 px-3 py-2 text-sm text-white ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Default data source</option>
              {sources.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label
              htmlFor="report-description"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              Description
            </label>
            <input
              id="report-description"
              type="text"
              value={form.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              placeholder="Brief description of what this report shows"
              className="w-full rounded-lg bg-gray-900/60 px-3 py-2 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
            />
          </div>

          {/* SQL */}
          <div className="sm:col-span-2">
            <label htmlFor="report-sql" className="mb-1.5 block text-sm font-medium text-gray-300">
              SQL Query <span className="text-red-400">*</span>
            </label>
            <textarea
              id="report-sql"
              value={form.query}
              onChange={(e) => handleFormChange("query", e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder="SELECT * FROM users WHERE created_at > NOW() - INTERVAL '30 days';"
              className="w-full resize-none rounded-lg bg-gray-900/60 px-3 py-2 font-mono text-sm text-gray-200 placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
            />
          </div>

          {/* Visualization type */}
          <div className="sm:col-span-2">
            <p className="mb-2 block text-sm font-medium text-gray-300">Visualization Type</p>
            <div className="flex flex-wrap gap-2">
              {vizOptions.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleFormChange("visualization", type)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.visualization === type
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-gray-700 bg-gray-900/40 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        {saveError && <p className="mt-3 text-sm text-red-400">{saveError}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewing || !form.query.trim()}
            className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-600 disabled:opacity-50"
          >
            <Play size={14} />
            {isPreviewing ? "Previewing..." : "Preview"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={14} />
            {isSaving ? "Saving..." : editingId ? "Update Report" : "Save Report"}
          </button>
        </div>
      </div>

      {/* Preview results */}
      {previewError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="font-mono text-sm text-red-400">{previewError}</p>
        </div>
      )}

      {previewResult && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-3">
            <span className="text-sm font-medium text-gray-300">Preview Results</span>
            <span className="text-xs text-gray-500">{previewResult.rows.length} rows</span>
          </div>
          <div className="p-4">
            {indexedPreviewRows.length === 0 ? (
              <EmptyState message="Query returned no rows" />
            ) : (
              <DataTable
                data={indexedPreviewRows}
                columns={previewColumns}
                keyExtractor={(row) => row._rowKey}
              />
            )}
          </div>
        </div>
      )}

      {/* Saved reports list */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-white">Saved Reports</h2>
        {deleteError && <p className="text-sm text-red-400 mt-2">{deleteError}</p>}

        {reportsLoading && <LoadingState />}
        {reportsError && <ErrorState message={reportsError} onRetry={refetchReports} />}
        {!reportsLoading && !reportsError && savedReports.length === 0 && (
          <EmptyState message="No reports saved yet. Create your first report above." />
        )}

        {savedReports.length > 0 && (
          <div className="space-y-3">
            {savedReports.map((report) => {
              const vizOpt = vizOptions.find((v) => v.type === report.visualization);
              const VizIcon = vizOpt?.icon ?? Table;

              return (
                <div
                  key={report.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-700/50 bg-gray-800/50 px-5 py-4"
                >
                  <div className="shrink-0 rounded-lg bg-gray-700/50 p-2.5">
                    <VizIcon size={18} className="text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{report.name}</p>
                    {report.description && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">{report.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-600">
                      Updated:{" "}
                      <span className="text-gray-500">
                        {new Date(report.updatedAt).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden rounded-full bg-gray-700/50 px-2.5 py-1 text-xs text-gray-400 sm:inline-flex">
                      {vizOpt?.label ?? report.visualization}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEdit(report)}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                      aria-label={`Edit ${report.name}`}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-500/10"
                      aria-label={`View ${report.name}`}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(report.id)}
                      disabled={deletingId === report.id}
                      className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                      aria-label={`Delete ${report.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
