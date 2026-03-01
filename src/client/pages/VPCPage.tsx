import type { VPC } from "@shared/types";
import { Network } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { StatCard } from "../components/StatCard";
import { useFetch } from "../lib/use-fetch";

export function VPCPage() {
  const { data: vpcs, loading, error, refetch } = useFetch<VPC[]>("/api/aws/vpc/list");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!vpcs || vpcs.length === 0) return <EmptyState message="No VPCs found" />;

  const totalSubnets = vpcs.reduce((sum, v) => sum + v.subnets, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="VPCs" value={vpcs.length} icon={<Network size={22} />} color="blue" />
        <StatCard
          title="Total Subnets"
          value={totalSubnets}
          icon={<Network size={22} />}
          color="green"
        />
        <StatCard
          title="Regions"
          value={new Set(vpcs.map((v) => v.region)).size}
          icon={<Network size={22} />}
          color="purple"
        />
      </div>

      <DataTable
        data={vpcs}
        keyExtractor={(v) => v.id}
        columns={[
          {
            key: "name",
            header: "Name",
            render: (v) => (
              <div>
                <p className="font-medium text-white">{v.name}</p>
                <p className="text-xs text-gray-500">{v.id}</p>
              </div>
            ),
          },
          {
            key: "cidr",
            header: "CIDR",
            render: (v) => <span className="font-mono text-xs">{v.cidr}</span>,
          },
          { key: "subnets", header: "Subnets", render: (v) => v.subnets },
          { key: "region", header: "Region", render: (v) => v.region },
          {
            key: "default",
            header: "Default",
            render: (v) =>
              v.isDefault ? (
                <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                  Default
                </span>
              ) : (
                <span className="text-xs text-gray-500">No</span>
              ),
          },
        ]}
      />
    </div>
  );
}
