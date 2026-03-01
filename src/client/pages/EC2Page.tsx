import { Play, Plus, RotateCcw, Square, Trash2 } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { ec2Instances } from "../lib/mock-data";

export function EC2Page() {
  const running = ec2Instances.filter((i) => i.state === "running").length;
  const stopped = ec2Instances.filter((i) => i.state === "stopped").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
            {running} running
          </span>
          <span className="rounded-full bg-gray-500/10 px-3 py-1 text-xs text-gray-400">
            {stopped} stopped
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Launch Instance
        </button>
      </div>

      <DataTable
        data={ec2Instances}
        keyExtractor={(i) => i.id}
        columns={[
          {
            key: "name",
            header: "Name",
            render: (i) => (
              <div>
                <p className="font-medium text-white">{i.name}</p>
                <p className="text-xs text-gray-500">{i.id}</p>
              </div>
            ),
          },
          {
            key: "type",
            header: "Type",
            render: (i) => <span className="font-mono text-xs">{i.type}</span>,
            className: "hidden sm:table-cell",
          },
          {
            key: "state",
            header: "State",
            render: (i) => <StatusBadge status={i.state} />,
          },
          {
            key: "az",
            header: "AZ",
            render: (i) => i.az,
            className: "hidden lg:table-cell",
          },
          {
            key: "ip",
            header: "Public IP",
            render: (i) => <span className="font-mono text-xs">{i.publicIp}</span>,
            className: "hidden md:table-cell",
          },
          {
            key: "cpu",
            header: "CPU",
            render: (i) => (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-700">
                  <div
                    className={`h-full rounded-full ${i.cpu > 80 ? "bg-red-500" : i.cpu > 50 ? "bg-yellow-500" : "bg-emerald-500"}`}
                    style={{ width: `${i.cpu}%` }}
                  />
                </div>
                <span className="text-xs">{i.cpu}%</span>
              </div>
            ),
            className: "hidden sm:table-cell",
          },
          {
            key: "actions",
            header: "Actions",
            render: (i) => (
              <div className="flex items-center gap-1">
                {i.state === "stopped" ? (
                  <button
                    type="button"
                    className="rounded p-2 text-emerald-400 hover:bg-emerald-500/10"
                    aria-label="Start instance"
                  >
                    <Play size={16} />
                  </button>
                ) : i.state === "running" ? (
                  <button
                    type="button"
                    className="rounded p-2 text-yellow-400 hover:bg-yellow-500/10"
                    aria-label="Stop instance"
                  >
                    <Square size={16} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded p-2 text-blue-400 hover:bg-blue-500/10"
                  aria-label="Reboot instance"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  type="button"
                  className="rounded p-2 text-red-400 hover:bg-red-500/10"
                  aria-label="Terminate instance"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
