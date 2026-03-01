import { Bell, Bot, Globe, Key, MessageSquare, Save, Shield } from "lucide-react";
import { useState } from "react";

type IntegrationConfig = {
  name: string;
  icon: typeof Bot;
  description: string;
  connected: boolean;
  fields: { label: string; placeholder: string; type: string }[];
};

const integrations: IntegrationConfig[] = [
  {
    name: "AWS",
    icon: Globe,
    description: "Connect to AWS using access key or IAM role",
    connected: true,
    fields: [
      { label: "AWS Region", placeholder: "us-east-1", type: "text" },
      { label: "Access Key ID", placeholder: "AKIA...", type: "password" },
      { label: "Secret Access Key", placeholder: "wJalr...", type: "password" },
    ],
  },
  {
    name: "Slack",
    icon: MessageSquare,
    description: "Send alerts and reports to Slack channels",
    connected: false,
    fields: [
      { label: "Webhook URL", placeholder: "https://hooks.slack.com/services/...", type: "text" },
      { label: "Default Channel", placeholder: "#aws-alerts", type: "text" },
    ],
  },
  {
    name: "Claude AI",
    icon: Bot,
    description: "AI-powered analysis and recommendations via Claude",
    connected: false,
    fields: [
      { label: "API Key", placeholder: "sk-ant-...", type: "password" },
      { label: "Model", placeholder: "claude-sonnet-4-6", type: "text" },
    ],
  },
  {
    name: "ChatGPT",
    icon: Bot,
    description: "Alternative AI assistant via OpenAI",
    connected: false,
    fields: [
      { label: "API Key", placeholder: "sk-...", type: "password" },
      { label: "Model", placeholder: "gpt-4o", type: "text" },
    ],
  },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"integrations" | "notifications" | "security">(
    "integrations",
  );

  const tabs = [
    { key: "integrations" as const, label: "Integrations", icon: <Key size={16} /> },
    { key: "notifications" as const, label: "Notifications", icon: <Bell size={16} /> },
    { key: "security" as const, label: "Security", icon: <Shield size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-700/50 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm transition-colors ${
              activeTab === tab.key
                ? "bg-gray-700/50 font-medium text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "integrations" && (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <integration.icon size={22} className="text-gray-400" />
                  <div>
                    <h3 className="font-medium text-white">{integration.name}</h3>
                    <p className="text-xs text-gray-500">{integration.description}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    integration.connected
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-gray-500/10 text-gray-400"
                  }`}
                >
                  {integration.connected ? "Connected" : "Not Connected"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {integration.fields.map((field) => (
                  <div key={field.label}>
                    <label className="mb-1 block text-xs text-gray-400">
                      {field.label}
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        className="mt-1 w-full rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white placeholder-gray-600 ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500"
                      />
                    </label>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Save size={14} />
                Save
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-4 font-medium text-white">Notification Preferences</h3>
          <div className="space-y-4">
            {[
              { label: "EC2 state changes", description: "Notify when instances start or stop" },
              { label: "CloudWatch alarms", description: "Notify on alarm state changes" },
              { label: "Cost threshold alerts", description: "Notify when costs exceed budget" },
              {
                label: "Security events",
                description: "IAM changes, unauthorized access attempts",
              },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{pref.label}</p>
                  <p className="text-xs text-gray-500">{pref.description}</p>
                </div>
                <div className="relative h-6 w-11 rounded-full bg-gray-600">
                  <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
          <h3 className="mb-4 font-medium text-white">Security Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Session Timeout
                <select className="mt-1 rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500">
                  <option>15 minutes</option>
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>4 hours</option>
                </select>
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                API Key Rotation
                <select className="mt-1 rounded-lg bg-gray-900/50 px-3 py-2 text-sm text-white ring-1 ring-inset ring-gray-700 focus:outline-none focus:ring-blue-500">
                  <option>Every 30 days</option>
                  <option>Every 60 days</option>
                  <option>Every 90 days</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
