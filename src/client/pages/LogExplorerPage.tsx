import type { AiLogAnalysis, LogEntry, LogLevel } from "@shared/types";
import {
  Activity,
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  Search,
  X,
} from "lucide-react";
import { useState } from "react";
import { StatCard } from "../components/StatCard";
import { aiLogAnalysis, logEntries, logGroups } from "../lib/mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) {
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(0)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Level badge ─────────────────────────────────────────────────────────────

type LevelBadgeProps = { level: LogLevel };

const levelStyles: Record<LogLevel, string> = {
  INFO: "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  WARN: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/25",
  ERROR: "bg-red-500/15 text-red-400 ring-red-500/25",
  DEBUG: "bg-gray-500/15 text-gray-400 ring-gray-500/25",
  FATAL: "bg-red-600/20 text-red-300 ring-red-600/30 font-bold",
};

function LevelBadge({ level }: LevelBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-xs ring-1 ring-inset ${levelStyles[level]}`}
    >
      {level}
    </span>
  );
}

// ─── AI Analysis panel ────────────────────────────────────────────────────────

type SeverityLevel = AiLogAnalysis["severity"];

const severityStyles: Record<SeverityLevel, string> = {
  low: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  medium: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/25",
  high: "bg-orange-500/15 text-orange-400 ring-orange-500/25",
  critical: "bg-red-500/15 text-red-400 ring-red-500/25",
};

type AiPanelProps = { analysis: AiLogAnalysis; onClose: () => void };

function AiAnalysisPanel({ analysis, onClose }: AiPanelProps) {
  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Log Analysis</h3>
            <p className="text-xs text-gray-500">Powered by Amazon Bedrock</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${severityStyles[analysis.severity]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {analysis.severity.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 transition-colors hover:text-gray-300"
            aria-label="Close AI analysis"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Summary</p>
          <p className="text-sm text-gray-300">{analysis.summary}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
              Root Cause
            </p>
            <p className="text-sm text-gray-300">{analysis.rootCause}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
              Recommendation
            </p>
            <p className="text-sm text-gray-300">{analysis.recommendation}</p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            Related Patterns
          </p>
          <ul className="space-y-1.5">
            {analysis.relatedPatterns.map((pattern) => (
              <li key={pattern} className="flex items-start gap-2 text-sm text-gray-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                {pattern}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Log entry row ────────────────────────────────────────────────────────────

type LogEntryRowProps = { entry: LogEntry };

function LogEntryRow({ entry }: LogEntryRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className="mt-0.5 shrink-0 text-gray-600">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="w-[80px] shrink-0 text-xs tabular-nums text-gray-500">
          {formatTimestamp(entry.timestamp)}
        </span>
        <span className="w-[56px] shrink-0">
          <LevelBadge level={entry.level} />
        </span>
        <span className="hidden w-[160px] shrink-0 truncate text-xs text-gray-500 sm:block">
          {entry.source}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-gray-300">
          {entry.message}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-700/30 bg-gray-900/50 px-4 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="mb-0.5 text-xs font-medium text-gray-500">Timestamp</p>
              <p className="font-mono text-xs text-gray-300">
                {formatDate(entry.timestamp)} {formatTimestamp(entry.timestamp)} UTC
              </p>
            </div>
            <div>
              <p className="mb-0.5 text-xs font-medium text-gray-500">Log Group</p>
              <p className="font-mono text-xs text-gray-300">{entry.logGroup}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs font-medium text-gray-500">Log Stream</p>
              <p className="truncate font-mono text-xs text-gray-300">{entry.logStream}</p>
            </div>
            {entry.requestId && (
              <div>
                <p className="mb-0.5 text-xs font-medium text-gray-500">Request ID</p>
                <p className="font-mono text-xs text-gray-300">{entry.requestId}</p>
              </div>
            )}
            <div>
              <p className="mb-0.5 text-xs font-medium text-gray-500">Source</p>
              <p className="font-mono text-xs text-gray-300">{entry.source}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-gray-500">Full Message</p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-gray-950/60 p-3 font-mono text-xs text-gray-300">
              {entry.message}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TimeRange = "1h" | "6h" | "24h" | "7d";
type LevelFilter = "ALL" | LogLevel;

const TIME_RANGES: TimeRange[] = ["1h", "6h", "24h", "7d"];
const LEVEL_FILTERS: LevelFilter[] = ["ALL", "ERROR", "FATAL", "WARN", "INFO", "DEBUG"];

function groupHasRecentError(groupName: string): boolean {
  return logEntries.some(
    (e) => e.logGroup === groupName && (e.level === "ERROR" || e.level === "FATAL"),
  );
}

export function LogExplorerPage() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("ALL");
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [showAi, setShowAi] = useState(false);

  const totalEvents = logEntries.length;
  const errorCount = logEntries.filter((e) => e.level === "ERROR" || e.level === "FATAL").length;
  const activeStreams = logGroups.reduce((sum, g) => sum + g.streamCount, 0);

  const filtered = logEntries.filter((entry) => {
    const matchGroup = selectedGroup === null || entry.logGroup === selectedGroup;
    const matchLevel = levelFilter === "ALL" || entry.level === levelFilter;
    const matchSearch =
      search === "" ||
      entry.message.toLowerCase().includes(search.toLowerCase()) ||
      entry.source.toLowerCase().includes(search.toLowerCase()) ||
      (entry.requestId?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchGroup && matchLevel && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Events (24h)"
          value={totalEvents.toLocaleString()}
          icon={<Layers size={22} />}
          color="blue"
          subtitle={`across ${logGroups.length} log groups`}
        />
        <StatCard
          title="Errors (24h)"
          value={errorCount}
          icon={<AlertTriangle size={22} />}
          color="red"
          trend={{ value: "+3 vs 1h ago", positive: false }}
        />
        <StatCard
          title="Avg Latency"
          value="245 ms"
          icon={<Clock size={22} />}
          color="orange"
          subtitle="Lambda p50"
        />
        <StatCard
          title="Active Streams"
          value={activeStreams}
          icon={<Activity size={22} />}
          color="green"
          subtitle={`${logGroups.length} groups`}
        />
      </div>

      {/* Main layout: sidebar + content */}
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Log groups — mobile: select dropdown, desktop: sidebar panel */}
        <div className="lg:hidden">
          <label
            htmlFor="log-group-select"
            className="mb-1 block text-xs font-medium text-gray-400"
          >
            Log Group
          </label>
          <select
            id="log-group-select"
            value={selectedGroup ?? ""}
            onChange={(e) => setSelectedGroup(e.target.value === "" ? null : e.target.value)}
            className="w-full rounded-lg border border-gray-700/50 bg-gray-800/70 px-3 py-2 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Log Groups</option>
            {logGroups.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 overflow-hidden">
            <div className="border-b border-gray-700/50 px-4 py-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Log Groups
              </h3>
            </div>
            <div className="divide-y divide-gray-700/30">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-white/[0.03] ${
                  selectedGroup === null ? "bg-blue-500/10 text-blue-400" : "text-gray-300"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-gray-600" />
                <span className="flex-1 truncate text-xs font-medium">All Groups</span>
                <span className="shrink-0 text-xs text-gray-500">{logEntries.length}</span>
              </button>
              {logGroups.map((g) => {
                const count = logEntries.filter((e) => e.logGroup === g.name).length;
                const hasError = groupHasRecentError(g.name);
                const isActive = selectedGroup === g.name;
                return (
                  <button
                    type="button"
                    key={g.name}
                    onClick={() => setSelectedGroup(isActive ? null : g.name)}
                    className={`flex w-full items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] ${
                      isActive ? "bg-blue-500/10" : ""
                    }`}
                  >
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${hasError ? "bg-red-400" : "bg-emerald-400"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-xs font-medium ${isActive ? "text-blue-400" : "text-gray-300"}`}
                      >
                        {g.name.split("/").pop()}
                      </span>
                      <span className="block truncate text-xs text-gray-600">{g.name}</span>
                      <span className="mt-0.5 block text-xs text-gray-600">
                        {formatBytes(g.storedBytes)} &middot; {g.streamCount} streams
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Content area */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Search + filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages, request IDs, sources..."
                className="w-full rounded-lg border border-gray-700/50 bg-gray-800/70 py-2 pl-9 pr-3 text-sm text-gray-300 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as LevelFilter)}
                className="rounded-lg border border-gray-700/50 bg-gray-800/70 px-3 py-2 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
              >
                {LEVEL_FILTERS.map((l) => (
                  <option key={l} value={l}>
                    {l === "ALL" ? "All Levels" : l}
                  </option>
                ))}
              </select>

              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="rounded-lg border border-gray-700/50 bg-gray-800/70 px-3 py-2 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
              >
                {TIME_RANGES.map((r) => (
                  <option key={r} value={r}>
                    Last {r}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowAi(!showAi)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  showAi
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                }`}
              >
                <Bot size={14} />
                Analyze with AI
              </button>
            </div>
          </div>

          {/* AI analysis panel */}
          {showAi && <AiAnalysisPanel analysis={aiLogAnalysis} onClose={() => setShowAi(false)} />}

          {/* Log entries list */}
          <div className="overflow-hidden rounded-xl border border-gray-700/50 bg-gray-800/50">
            {/* Table header */}
            <div className="hidden items-center gap-3 border-b border-gray-700/50 px-4 py-2.5 sm:flex">
              <span className="w-4 shrink-0" />
              <span className="w-[80px] shrink-0 text-xs font-medium uppercase tracking-wider text-gray-500">
                Time
              </span>
              <span className="w-[56px] shrink-0 text-xs font-medium uppercase tracking-wider text-gray-500">
                Level
              </span>
              <span className="hidden w-[160px] shrink-0 text-xs font-medium uppercase tracking-wider text-gray-500 sm:block">
                Source
              </span>
              <span className="flex-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                Message
              </span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-700/20">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-600">
                  No log entries match your filters
                </div>
              ) : (
                filtered.map((entry) => <LogEntryRow key={entry.id} entry={entry} />)
              )}
            </div>

            {/* Footer count */}
            {filtered.length > 0 && (
              <div className="border-t border-gray-700/30 px-4 py-2.5 text-xs text-gray-600">
                Showing {filtered.length} of {logEntries.length} entries &middot; time range:{" "}
                {timeRange}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
