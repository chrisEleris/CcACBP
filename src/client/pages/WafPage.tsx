import type { WafRule, WafTopThreat } from "@shared/types";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Info,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataTable } from "../components/DataTable";
import { StatCard } from "../components/StatCard";
import { wafRules, wafTopThreats, wafTraffic, wafWebAcl } from "../lib/mock-data";

// ─── Type badges ──────────────────────────────────────────────────────────────

type TypeBadgeProps = { type: WafRule["type"] };

const typeStyles: Record<WafRule["type"], string> = {
  MANAGED: "bg-purple-500/15 text-purple-400 ring-purple-500/25",
  REGULAR: "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  RATE_BASED: "bg-orange-500/15 text-orange-400 ring-orange-500/25",
};

const typeLabels: Record<WafRule["type"], string> = {
  MANAGED: "Managed",
  REGULAR: "Regular",
  RATE_BASED: "Rate Based",
};

function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${typeStyles[type]}`}
    >
      {typeLabels[type]}
    </span>
  );
}

// ─── Action badges ────────────────────────────────────────────────────────────

type ActionBadgeProps = { action: WafRule["action"] };

const actionStyles: Record<WafRule["action"], string> = {
  BLOCK: "bg-red-500/15 text-red-400 ring-red-500/25",
  ALLOW: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
  COUNT: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/25",
};

function ActionBadge({ action }: ActionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${actionStyles[action]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {action}
    </span>
  );
}

// ─── Block-rate bar ───────────────────────────────────────────────────────────

type BlockRateBarProps = { rate: number };

function BlockRateBar({ rate }: BlockRateBarProps) {
  const color = rate > 80 ? "bg-red-500" : rate > 50 ? "bg-yellow-500" : "bg-emerald-500";
  const textColor = rate > 80 ? "text-red-400" : rate > 50 ? "text-yellow-400" : "text-emerald-400";
  return (
    <div className="flex min-w-[80px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className={`w-10 shrink-0 text-right text-xs tabular-nums ${textColor}`}>
        {rate.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────

type PriorityBadgeProps = { priority: number };

function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-gray-300">
      {priority}
    </span>
  );
}

// ─── Enabled toggle (read-only display) ──────────────────────────────────────

type EnabledPillProps = { enabled: boolean };

function EnabledPill({ enabled }: EnabledPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        enabled
          ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
          : "bg-gray-500/10 text-gray-500 ring-gray-500/20"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

// ─── Country block rate cell ──────────────────────────────────────────────────

type BlockRateCellProps = { blocked: number; requests: number };

function BlockRateCell({ blocked, requests }: BlockRateCellProps) {
  const rate = requests > 0 ? (blocked / requests) * 100 : 0;
  const color = rate > 80 ? "text-red-400" : rate > 50 ? "text-yellow-400" : "text-emerald-400";
  return <span className={`text-sm font-medium tabular-nums ${color}`}>{rate.toFixed(0)}%</span>;
}

// ─── AI Security Insights card ────────────────────────────────────────────────

const aiFindings = [
  "GeoBlockHighRiskCountries rule is operating at 100% block rate — all matched requests are from CN/RU/KP/IR. Effectiveness is optimal.",
  "BotControlManagedRuleSet is in COUNT mode with 6,720 matches — significant bot traffic detected. Recommend switching to BLOCK after review.",
  "RateLimitRule-2000rpm is blocking 72.4% of matched traffic; the remaining 27.6% may indicate threshold tuning opportunities.",
  "CustomXSSProtection rule is currently disabled — re-enable after validating against staging traffic to avoid false positives.",
];

const aiRecommendations: Array<{
  title: string;
  detail: string;
  severity: "high" | "medium" | "info";
  icon: typeof AlertTriangle;
}> = [
  {
    title: "Enable Bot Control BLOCK mode",
    detail:
      "6,720 bot requests were only counted, not blocked. After validating legitimate bot traffic (Googlebot, etc.), switch action to BLOCK.",
    severity: "high",
    icon: ShieldAlert,
  },
  {
    title: "Re-enable CustomXSSProtection rule",
    detail:
      "The XSS protection rule is disabled. Review staging logs for false positives and re-enable in production to close this coverage gap.",
    severity: "medium",
    icon: AlertTriangle,
  },
  {
    title: "Tune RateLimitRule threshold",
    detail:
      "Consider reducing the rate limit from 2,000 to 1,500 req/5min during off-peak hours and increasing to 3,000 during verified peak business hours.",
    severity: "info",
    icon: Info,
  },
];

const recSeverityStyles = {
  high: "border-red-500/30 bg-red-950/20",
  medium: "border-yellow-500/30 bg-yellow-950/20",
  info: "border-blue-500/30 bg-blue-950/20",
};

const recIconStyles = {
  high: "text-red-400",
  medium: "text-yellow-400",
  info: "text-blue-400",
};

// ─── Effectiveness score ──────────────────────────────────────────────────────

type ScoreBarProps = { score: number };

function ScoreBar({ score }: ScoreBarProps) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
  const textColor =
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="flex items-center gap-4">
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-2xl font-bold tabular-nums ${textColor}`}>{score}/100</span>
    </div>
  );
}

// ─── Tooltip style ────────────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "8px",
  color: "#e5e7eb",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export function WafPage() {
  const [showDisabled, setShowDisabled] = useState(false);

  const blockRate =
    wafWebAcl.requestsSampled > 0
      ? ((wafWebAcl.blockedRequests / wafWebAcl.requestsSampled) * 100).toFixed(1)
      : "0.0";

  const activeRuleCount = wafRules.filter((r) => r.enabled).length;

  const visibleRules: WafRule[] = showDisabled ? wafRules : wafRules.filter((r) => r.enabled);

  const sortedThreats: WafTopThreat[] = [...wafTopThreats].sort((a, b) => b.blocked - a.blocked);

  return (
    <div className="space-y-6">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Requests (24h)"
          value={wafWebAcl.requestsSampled.toLocaleString()}
          icon={<Shield size={22} />}
          color="blue"
          subtitle={wafWebAcl.region}
        />
        <StatCard
          title="Blocked Requests"
          value={wafWebAcl.blockedRequests.toLocaleString()}
          icon={<ShieldAlert size={22} />}
          color="red"
          trend={{ value: "+12% vs yesterday", positive: false }}
        />
        <StatCard
          title="Block Rate"
          value={`${blockRate}%`}
          icon={<TrendingDown size={22} />}
          color="orange"
          subtitle="of sampled requests"
        />
        <StatCard
          title="Active Rules"
          value={activeRuleCount}
          icon={<ShieldCheck size={22} />}
          color="green"
          subtitle={`${wafRules.length} total`}
        />
      </div>

      {/* ── Traffic Overview chart ── */}
      <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
        <h3 className="mb-4 text-sm font-medium text-gray-400">
          Traffic Overview — 24h ({wafWebAcl.name})
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={wafTraffic}>
            <defs>
              <linearGradient id="colorAllowed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCounted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              fontSize={11}
              tick={{ fill: "#6b7280" }}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={11}
              tick={{ fill: "#6b7280" }}
              tickLine={false}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number | undefined, name: string | undefined) => [
                (value ?? 0).toLocaleString(),
                name ?? "",
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              formatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1)}
            />
            <Area
              type="monotone"
              dataKey="allowed"
              name="allowed"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorAllowed)"
            />
            <Area
              type="monotone"
              dataKey="blocked"
              name="blocked"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#colorBlocked)"
            />
            <Area
              type="monotone"
              dataKey="counted"
              name="counted"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#colorCounted)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Top Threats ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Zap size={16} className="text-orange-400" />
          <h3 className="text-sm font-medium text-gray-300">Top Threats (24h)</h3>
        </div>
        <DataTable<WafTopThreat>
          data={sortedThreats}
          keyExtractor={(t) => t.source}
          columns={[
            {
              key: "source",
              header: "Source IP",
              render: (t) => (
                <span className="font-mono text-xs font-medium text-white">{t.source}</span>
              ),
            },
            {
              key: "country",
              header: "Country",
              render: (t) => <span className="text-sm">{t.country}</span>,
            },
            {
              key: "requests",
              header: "Requests",
              render: (t) => <span className="tabular-nums">{t.requests.toLocaleString()}</span>,
              className: "hidden sm:table-cell",
            },
            {
              key: "blocked",
              header: "Blocked",
              render: (t) => (
                <span className="font-medium tabular-nums text-red-400">
                  {t.blocked.toLocaleString()}
                </span>
              ),
            },
            {
              key: "blockRate",
              header: "Block Rate",
              render: (t) => <BlockRateCell blocked={t.blocked} requests={t.requests} />,
              className: "hidden md:table-cell",
            },
            {
              key: "rule",
              header: "Rule Triggered",
              render: (t) => (
                <span className="max-w-[160px] truncate font-mono text-xs text-gray-400 block">
                  {t.ruleTriggered}
                </span>
              ),
              className: "hidden lg:table-cell",
            },
          ]}
        />
      </div>

      {/* ── WAF Rules table ── */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-blue-400" />
            <h3 className="text-sm font-medium text-gray-300">Rule Configuration</h3>
            <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
              {visibleRules.length} rule{visibleRules.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowDisabled(!showDisabled)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              showDisabled
                ? "border-gray-600 bg-gray-700 text-gray-300"
                : "border-gray-700/50 bg-gray-800/50 text-gray-500 hover:border-gray-600 hover:text-gray-300"
            }`}
          >
            {showDisabled ? <CheckCircle2 size={13} /> : null}
            {showDisabled ? "Showing disabled" : "Show disabled"}
          </button>
        </div>

        <DataTable<WafRule>
          data={visibleRules}
          keyExtractor={(r) => r.id}
          columns={[
            {
              key: "priority",
              header: "#",
              render: (r) => <PriorityBadge priority={r.priority} />,
            },
            {
              key: "name",
              header: "Rule Name",
              render: (r) => (
                <div className="max-w-[200px]">
                  <span className="block truncate text-sm font-medium text-white">{r.name}</span>
                  <span className="block truncate text-xs text-gray-600">{r.description}</span>
                </div>
              ),
            },
            {
              key: "type",
              header: "Type",
              render: (r) => <TypeBadge type={r.type} />,
              className: "hidden sm:table-cell",
            },
            {
              key: "action",
              header: "Action",
              render: (r) => <ActionBadge action={r.action} />,
            },
            {
              key: "ruleGroup",
              header: "Rule Group",
              render: (r) => <span className="text-xs text-gray-500">{r.ruleGroup}</span>,
              className: "hidden lg:table-cell",
            },
            {
              key: "matches",
              header: "Matches (24h)",
              render: (r) => (
                <span className="tabular-nums">{r.matchesLast24h.toLocaleString()}</span>
              ),
              className: "hidden md:table-cell",
            },
            {
              key: "blockRate",
              header: "Block Rate",
              render: (r) =>
                r.action === "COUNT" ? (
                  <span className="text-xs text-gray-600">N/A (COUNT)</span>
                ) : (
                  <BlockRateBar rate={r.blockRate} />
                ),
              className: "hidden md:table-cell",
            },
            {
              key: "enabled",
              header: "Status",
              render: (r) => <EnabledPill enabled={r.enabled} />,
            },
          ]}
        />
      </div>

      {/* ── AI Security Insights ── */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Security Insights</h3>
            <p className="text-xs text-gray-500">Powered by Amazon Bedrock — updated 5 min ago</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Effectiveness score */}
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
              Rule Effectiveness Score
            </p>
            <ScoreBar score={87} />
            <p className="mt-3 text-xs text-gray-500">
              Based on block rates, rule coverage, and traffic analysis. Score of 87/100 is
              considered good — address the findings below to improve.
            </p>
          </div>

          {/* Key findings */}
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
              Key Findings
            </p>
            <ul className="space-y-2.5">
              {aiFindings.map((finding) => (
                <li key={finding} className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                  {finding}
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Recommendations
            </p>
            {aiRecommendations.map((rec) => {
              const Icon = rec.icon;
              return (
                <div
                  key={rec.title}
                  className={`rounded-lg border p-3 ${recSeverityStyles[rec.severity]}`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Icon size={14} className={recIconStyles[rec.severity]} />
                    <span className="text-xs font-semibold text-white">{rec.title}</span>
                  </div>
                  <p className="text-xs text-gray-400">{rec.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
