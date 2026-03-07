import {
  ArrowLeft,
  BarChart2,
  Calendar,
  Clock,
  Database,
  LineChart,
  PieChart,
  Play,
  ScatterChart,
  Table,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useFetch } from "../lib/use-fetch";

type Props = {
  reportId: string;
  onBack: () => void;
};

type VisualizationType = "table" | "bar" | "line" | "pie" | "area" | "scatter";

type ReportDetail = {
  id: string;
  name: string;
  description: string;
  visualizationType: VisualizationType;
  dataSourceName: string;
  sql: string;
  lastRunAt: string | null;
  createdAt: string;
};

type ExecutionRecord = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: "success" | "failed" | "running";
  rowCount: number | null;
  durationMs: number | null;
  errorMessage: string | null;
};

type ResultRow = Record<string, string | number | boolean | null>;

type RunResult = {
  columns: string[];
  rows: ResultRow[];
  rowCount: number;
  executionTimeMs: number;
};

const vizLabelMap: Record<VisualizationType, { label: string; icon: typeof Table }> = {
  table: { label: "Table", icon: Table },
  bar: { label: "Bar Chart", icon: BarChart2 },
  line: { label: "Line Chart", icon: LineChart },
  pie: { label: "Pie Chart", icon: PieChart },
  area: { label: "Area Chart", icon: TrendingUp },
  scatter: { label: "Scatter Plot", icon: ScatterChart },
};

const executionStatusConfig: Record<
  ExecutionRecord["status"],
  { label: string; className: string }
> = {
  success: {
    label: "Success",
    className: "bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20",
  },
  running: {
    label: "Running",
    className: "bg-yellow-500/10 text-yellow-400 ring-1 ring-inset ring-yellow-500/20",
  },
};

export function ReportViewerPage({ reportId, onBack }: Props) {
  const {
    data: report,
    loading: reportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useFetch<ReportDetail>(`/api/reports/${reportId}`);

  const {
    data: executions,
    loading: execLoading,
    error: execError,
    refetch: refetchExecutions,
  } = useFetch<ExecutionRecord[]>(`/api/reports/${reportId}/executions`);

  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  async function handleRun() {
    setIsRunning(true);
    setRunError(null);
    setRunResult(null);
    try {
      const response = await fetch(`/api/reports/${reportId}/run`, {
        method: "POST",
      });
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? `Execution failed: ${response.statusText}`);
      }
      const body = (await response.json()) as { data: RunResult };
      setRunResult(body.data);
      refetchExecutions();
      refetchReport();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setIsRunning(false);
    }
  }

  if (reportLoading) return <LoadingState />;
  if (reportError) return <ErrorState message={reportError} onRetry={refetchReport} />;
  if (!report) return <EmptyState message="Report not found" />;

  const vizConfig = vizLabelMap[report.visualizationType];
  const VizIcon = vizConfig.icon;
  const executionList = executions ?? [];

  type IndexedResultRow = ResultRow & { _rowKey: string };
  const indexedResultRows: IndexedResultRow[] = runResult
    ? runResult.rows.map((row, idx) => ({ ...row, _rowKey: String(idx) }))
    : [];

  const resultColumns = runResult
    ? runResult.columns.map((col) => ({
        key: col,
        header: col,
        render: (row: IndexedResultRow) =>
          row[col] === null ? (
            <span className="text-gray-600">NULL</span>
          ) : (
            <span className="font-mono text-xs">{String(row[col])}</span>
          ),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{report.name}</h1>
          {report.description && (
            <p className="mt-0.5 text-sm text-gray-400">{report.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          <Play size={15} />
          {isRunning ? "Running..." : "Run Report"}
        </button>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3">
          <VizIcon size={18} className="shrink-0 text-blue-400" />
          <div>
            <p className="text-xs text-gray-500">Visualization</p>
            <p className="text-sm font-medium text-white">{vizConfig.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3">
          <Database size={18} className="shrink-0 text-purple-400" />
          <div>
            <p className="text-xs text-gray-500">Data Source</p>
            <p className="text-sm font-medium text-white">{report.dataSourceName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3">
          <Clock size={18} className="shrink-0 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Last Run</p>
            <p className="text-sm font-medium text-white">{report.lastRunAt ?? "Never"}</p>
          </div>
        </div>
      </div>

      {/* Run error */}
      {runError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="font-mono text-sm text-red-400">{runError}</p>
        </div>
      )}

      {/* Run results */}
      {runResult && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-3">
            <span className="text-sm font-medium text-gray-300">Results</span>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{runResult.rowCount} rows</span>
              <span>{runResult.executionTimeMs}ms</span>
            </div>
          </div>
          <div className="p-4">
            {indexedResultRows.length === 0 ? (
              <EmptyState message="Report returned no data" />
            ) : (
              <DataTable
                data={indexedResultRows}
                columns={resultColumns}
                keyExtractor={(row) => row._rowKey}
              />
            )}
          </div>
        </div>
      )}

      {/* Execution history */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-white">Execution History</h2>

        {execLoading && <LoadingState />}
        {execError && <ErrorState message={execError} onRetry={refetchExecutions} />}
        {!execLoading && !execError && executionList.length === 0 && (
          <EmptyState message="No execution history yet. Run the report to see results." />
        )}

        {executionList.length > 0 && (
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50">
            <div className="divide-y divide-gray-700/30">
              {executionList.map((exec) => {
                const statusConf = executionStatusConfig[exec.status];
                return (
                  <div key={exec.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConf.className}`}
                    >
                      {statusConf.label}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar size={12} />
                      {exec.startedAt}
                    </div>
                    {exec.durationMs !== null && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock size={12} />
                        {exec.durationMs}ms
                      </div>
                    )}
                    {exec.rowCount !== null && (
                      <span className="text-xs text-gray-500">{exec.rowCount} rows</span>
                    )}
                    {exec.errorMessage && (
                      <span className="truncate text-xs text-red-400">{exec.errorMessage}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
