type Status = "running" | "stopped" | "pending" | "error" | "healthy" | "warning" | "terminated";

type StatusBadgeProps = {
  status: Status;
};

const statusConfig: Record<Status, { label: string; className: string }> = {
  running: {
    label: "Running",
    className: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  },
  stopped: { label: "Stopped", className: "bg-gray-500/10 text-gray-400 ring-gray-500/20" },
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20" },
  error: { label: "Error", className: "bg-red-500/10 text-red-400 ring-red-500/20" },
  healthy: {
    label: "Healthy",
    className: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  },
  warning: { label: "Warning", className: "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20" },
  terminated: {
    label: "Terminated",
    className: "bg-red-500/10 text-red-400 ring-red-500/20",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
