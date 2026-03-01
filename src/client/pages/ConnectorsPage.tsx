import {
  Bot,
  CheckCircle,
  Cloud,
  ExternalLink,
  MessageSquare,
  Plug,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useState } from "react";

type ConnectorStatus = "connected" | "disconnected" | "error";

type Connector = {
  id: string;
  name: string;
  description: string;
  icon: typeof Bot;
  status: ConnectorStatus;
  lastSync: string;
  features: string[];
  docsUrl: string;
};

const connectors: Connector[] = [
  {
    id: "aws-mcp",
    name: "AWS MCP Server",
    description:
      "Model Context Protocol server for AWS. Provides direct access to AWS services through a unified AI-compatible interface. Supports EC2, S3, Lambda, CloudWatch, IAM, and more.",
    icon: Cloud,
    status: "disconnected",
    lastSync: "-",
    features: [
      "List and manage EC2 instances",
      "S3 bucket operations",
      "CloudWatch metrics & alarms",
      "Lambda function management",
      "IAM user/role queries",
      "Cost Explorer data",
      "VPC and networking info",
    ],
    docsUrl: "https://github.com/aws/aws-mcp",
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Real-time notifications and interactive commands. Send alerts for CloudWatch alarms, cost spikes, EC2 state changes, and security events directly to your Slack channels.",
    icon: MessageSquare,
    status: "disconnected",
    lastSync: "-",
    features: [
      "CloudWatch alarm notifications",
      "Cost threshold alerts",
      "EC2 state change alerts",
      "Security event notifications",
      "Slash commands for quick lookups",
      "Interactive approval workflows",
    ],
    docsUrl: "https://api.slack.com/",
  },
  {
    id: "claude-ai",
    name: "Claude AI (Anthropic)",
    description:
      "AI-powered infrastructure analysis and recommendations. Uses Claude to analyze your AWS environment, suggest optimizations, explain errors, and generate IaC templates.",
    icon: Bot,
    status: "disconnected",
    lastSync: "-",
    features: [
      "Infrastructure cost optimization",
      "Security posture analysis",
      "Error log analysis & root cause",
      "IaC template generation (Terraform/CDK)",
      "Architecture recommendations",
      "Natural language AWS queries",
    ],
    docsUrl: "https://docs.anthropic.com/",
  },
  {
    id: "chatgpt",
    name: "ChatGPT (OpenAI)",
    description:
      "Alternative AI assistant for infrastructure management. Provides analysis, recommendations, and natural language interaction with your AWS resources.",
    icon: Bot,
    status: "disconnected",
    lastSync: "-",
    features: [
      "Resource analysis & recommendations",
      "Cost optimization suggestions",
      "Script and automation generation",
      "Troubleshooting assistance",
      "Documentation generation",
    ],
    docsUrl: "https://platform.openai.com/docs",
  },
];

const statusConfig: Record<ConnectorStatus, { label: string; className: string }> = {
  connected: {
    label: "Connected",
    className: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  },
  disconnected: {
    label: "Not Connected",
    className: "bg-gray-500/10 text-gray-400 ring-gray-500/20",
  },
  error: { label: "Error", className: "bg-red-500/10 text-red-400 ring-red-500/20" },
};

export function ConnectorsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const connectedCount = connectors.filter((c) => c.status === "connected").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plug size={20} className="text-gray-400" />
          <span className="text-sm text-gray-400">
            {connectedCount} of {connectors.length} integrations connected
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {connectors.map((connector) => {
          const isExpanded = expandedId === connector.id;
          const config = statusConfig[connector.status];

          return (
            <div
              key={connector.id}
              className="rounded-xl border border-gray-700/50 bg-gray-800/50 transition-all"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : connector.id)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-gray-700/50 p-2.5">
                    <connector.icon size={24} className="text-gray-300" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{connector.name}</h3>
                    <p className="mt-0.5 max-w-xl text-xs text-gray-500">{connector.description}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${config.className}`}
                >
                  {connector.status === "connected" ? (
                    <CheckCircle size={12} />
                  ) : (
                    <XCircle size={12} />
                  )}
                  {config.label}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-700/50 p-5">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div>
                      <h4 className="mb-3 text-xs font-medium tracking-wider text-gray-400 uppercase">
                        Features
                      </h4>
                      <ul className="space-y-2">
                        {connector.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-2 text-sm text-gray-300"
                          >
                            <CheckCircle size={14} className="shrink-0 text-emerald-500/70" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="mb-3 text-xs font-medium tracking-wider text-gray-400 uppercase">
                        Configuration
                      </h4>
                      {connector.id === "aws-mcp" && (
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              MCP Server URL
                              <input
                                type="text"
                                placeholder="http://localhost:3001"
                                className="mt-1 w-full rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                              />
                            </label>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              AWS Region
                              <input
                                type="text"
                                placeholder="us-east-1"
                                className="mt-1 w-full rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                              />
                            </label>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Auth Mode
                              <select className="mt-1 w-full rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500">
                                <option>IAM Role (Recommended)</option>
                                <option>Access Key</option>
                                <option>SSO Profile</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      )}
                      {connector.id === "slack" && (
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Bot Token
                              <input
                                type="password"
                                placeholder="xoxb-..."
                                className="mt-1 w-full rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                              />
                            </label>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Alerts Channel
                              <input
                                type="text"
                                placeholder="#aws-alerts"
                                className="mt-1 w-full rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                              />
                            </label>
                          </div>
                        </div>
                      )}
                      {connector.id === "claude-ai" && (
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Anthropic API Key
                              <input
                                type="password"
                                placeholder="sk-ant-..."
                                className="mt-1 w-full rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                              />
                            </label>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Model
                              <select className="mt-1 w-full rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500">
                                <option>claude-sonnet-4-6 (Recommended)</option>
                                <option>claude-opus-4-6</option>
                                <option>claude-haiku-4-5</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      )}
                      {connector.id === "chatgpt" && (
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              OpenAI API Key
                              <input
                                type="password"
                                placeholder="sk-..."
                                className="mt-1 w-full rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                              />
                            </label>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-400">
                              Model
                              <select className="mt-1 w-full rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500">
                                <option>gpt-4o (Recommended)</option>
                                <option>gpt-4-turbo</option>
                                <option>gpt-3.5-turbo</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                        >
                          <Plug size={14} />
                          Connect
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-600"
                        >
                          <RefreshCw size={14} />
                          Test
                        </button>
                        <a
                          href={connector.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline"
                        >
                          Docs <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
