import type { JenkinsServerInfo } from "@shared/types";
import { AlertTriangle, Settings } from "lucide-react";
import { ListOrdered, Loader2, Server, Workflow, Zap } from "lucide-react";

type JenkinsServerStatusBarProps = {
  server: JenkinsServerInfo;
};

export function JenkinsServerStatusBar({ server }: JenkinsServerStatusBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-700/50 bg-gray-800/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${server.connected ? "bg-emerald-400" : "bg-red-400"}`}
        />
        <span className="text-xs font-medium text-gray-300">
          {server.connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Server size={12} />
        <a
          href={server.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono hover:text-gray-300 transition-colors truncate max-w-[200px]"
        >
          {server.url}
        </a>
      </div>
      <span className="text-xs text-gray-600">v{server.version}</span>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Workflow size={12} />
        <span>
          {server.executorsBusy}/{server.executorsTotal} executors busy
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <ListOrdered size={12} />
        <span>{server.queueLength} queued</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Server size={12} />
        <span>{server.nodeCount} nodes</span>
      </div>
      {!server.connected && (
        <button
          type="button"
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
        >
          <Settings size={12} />
          Configure Jenkins
        </button>
      )}
    </div>
  );
}

type JenkinsNodeFooterProps = {
  server: JenkinsServerInfo;
};

export function JenkinsNodeFooter({ server }: JenkinsNodeFooterProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-700/50 bg-gray-800/30 px-4 py-3 text-xs text-gray-500">
      <div className="flex items-center gap-1.5">
        <Server size={12} />
        <span>{server.nodeCount} build nodes</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Zap size={12} />
        <span>
          {server.executorsBusy} / {server.executorsTotal} executors busy
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Loader2 size={12} />
        <span>{server.queueLength} jobs queued</span>
      </div>
      <span className="ml-auto">Jenkins v{server.version}</span>
    </div>
  );
}

type JenkinsDisconnectedBannerProps = {
  connected: boolean;
};

export function JenkinsDisconnectedBanner({ connected }: JenkinsDisconnectedBannerProps) {
  if (connected) return null;
  return (
    <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/10 p-5 text-center">
      <AlertTriangle size={24} className="mx-auto mb-2 text-yellow-400" />
      <p className="text-sm font-medium text-yellow-300">Jenkins server not connected</p>
      <p className="mt-1 text-xs text-gray-500">
        Configure your Jenkins server URL and credentials in Settings to fetch live data.
      </p>
      <button
        type="button"
        className="mt-3 flex items-center gap-1.5 mx-auto rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 transition-colors"
      >
        <Settings size={12} />
        Go to Settings
      </button>
    </div>
  );
}
