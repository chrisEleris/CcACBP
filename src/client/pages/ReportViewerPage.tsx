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
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { mutateApi } from "../lib/api";
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
  query: string;
  dataSourceId: string | null;
  visualization: VisualizationType;
  chartConfig: string;
  layout: string;
  parameters: string;
  createdAt: string;
  updatedAt: string;
};

type ExecutionRecord = {
  id: string;
  reportId: string;
  status: "running" | "completed" | "failed";
  rowCount: number | null;
  durationMs: number | null;
  error: string | null;
  resultPath: string | null;
  executedAt: string;
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
  completed: {
    label: "Completed",
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
  const [lastExecution, setLastExecution] = useState<ExecutionRecord | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  async function handleRun() {
    setIsRunning(true);
    setRunError(null);
    setLastExecution(null);
    try {
      const body = await mutateApi<ExecutionRecord>(`/api/reports/${reportId}/execute`, "POST");
      setLastExecution(body.data);
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

  const vizConfig = vizLabelMap[report.visualization];
  const VizIcon = vizConfig.icon;
  const executionList = executions ?? [];

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
            <p className="text-sm font-medium text-white">{report.dataSourceId ?? "Default"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3">
          <Clock size={18} className="shrink-0 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Created</p>
            <p className="text-sm font-medium text-white">
              {new Date(report.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* SQL Query */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
        <p className="mb-2 text-xs font-medium tracking-wider text-gray-500 uppercase">SQL Query</p>
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm text-gray-300">
          {report.query}
        </pre>
      </div>

      {/* Run error */}
      {runError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="font-mono text-sm text-red-400">{runError}</p>
        </div>
      )}

      {/* Last execution result */}
      {lastExecution && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm text-emerald-400">
            Execution {lastExecution.status} — {lastExecution.rowCount ?? 0} rows in{" "}
            {lastExecution.durationMs ?? 0}ms
          </p>
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
                      {new Date(exec.executedAt).toLocaleString()}
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
                    {exec.error && (
                      <span className="truncate text-xs text-red-400">{exec.error}</span>
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
