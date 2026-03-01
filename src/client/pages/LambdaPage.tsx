import { AlertTriangle, Zap } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { StatCard } from "../components/StatCard";
import { lambdaFunctions } from "../lib/mock-data";

export function LambdaPage() {
  const totalInvocations = lambdaFunctions.reduce((sum, f) => sum + f.invocations24h, 0);
  const totalErrors = lambdaFunctions.reduce((sum, f) => sum + f.errors24h, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Functions"
          value={lambdaFunctions.length}
          icon={<Zap size={22} />}
          color="purple"
        />
        <StatCard
          title="Invocations (24h)"
          value={totalInvocations.toLocaleString()}
          icon={<Zap size={22} />}
          color="blue"
        />
        <StatCard
          title="Errors (24h)"
          value={totalErrors}
          icon={<AlertTriangle size={22} />}
          color={totalErrors > 0 ? "red" : "green"}
        />
      </div>

      <DataTable
        data={lambdaFunctions}
        keyExtractor={(f) => f.name}
        columns={[
          {
            key: "name",
            header: "Function",
            render: (f) => <span className="font-medium text-white">{f.name}</span>,
          },
          {
            key: "runtime",
            header: "Runtime",
            render: (f) => <span className="font-mono text-xs">{f.runtime}</span>,
          },
          {
            key: "memory",
            header: "Memory",
            render: (f) => `${f.memory} MB`,
            className: "hidden sm:table-cell",
          },
          {
            key: "timeout",
            header: "Timeout",
            render: (f) => `${f.timeout}s`,
            className: "hidden md:table-cell",
          },
          {
            key: "invocations",
            header: "Invocations (24h)",
            render: (f) => f.invocations24h.toLocaleString(),
          },
          {
            key: "errors",
            header: "Errors (24h)",
            render: (f) => (
              <span className={f.errors24h > 10 ? "font-medium text-red-400" : "text-gray-300"}>
                {f.errors24h}
              </span>
            ),
          },
          {
            key: "lastInvoked",
            header: "Last Invoked",
            render: (f) =>
              new Date(f.lastInvoked).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            className: "hidden sm:table-cell",
          },
        ]}
      />
    </div>
  );
}
