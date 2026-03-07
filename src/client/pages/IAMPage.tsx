import type { IAMUser } from "@shared/types";
import { CheckCircle, Key, XCircle } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { StatCard } from "../components/StatCard";
import { useFetch } from "../lib/use-fetch";

export function IAMPage() {
  const { data: iamUsers, loading, error, refetch } = useFetch<IAMUser[]>("/api/aws/iam/users");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!iamUsers || iamUsers.length === 0) return <EmptyState message="No IAM users found" />;

  const mfaEnabled = iamUsers.filter((u) => u.mfaEnabled).length;
  const totalKeys = iamUsers.reduce((sum, u) => sum + u.accessKeys, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Total Users"
          value={iamUsers.length}
          icon={<Key size={22} />}
          color="purple"
        />
        <StatCard
          title="MFA Enabled"
          value={`${mfaEnabled}/${iamUsers.length}`}
          subtitle={mfaEnabled < iamUsers.length ? "Action needed" : "All secured"}
          icon={<CheckCircle size={22} />}
          color={mfaEnabled === iamUsers.length ? "green" : "orange"}
        />
        <StatCard
          title="Access Keys"
          value={totalKeys}
          subtitle="active keys"
          icon={<Key size={22} />}
          color="blue"
        />
      </div>

      {mfaEnabled < iamUsers.length && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <XCircle size={18} className="shrink-0 text-yellow-400" />
          <div>
            <p className="text-sm font-medium text-yellow-300">MFA not enabled for all users</p>
            <p className="text-xs text-yellow-400/80">
              {iamUsers
                .filter((u) => !u.mfaEnabled)
                .map((u) => u.name)
                .join(", ")}{" "}
              — enforce MFA for security compliance.
            </p>
          </div>
        </div>
      )}

      <DataTable
        data={iamUsers}
        keyExtractor={(u) => u.name}
        columns={[
          {
            key: "name",
            header: "User",
            render: (u) => <span className="font-medium text-white">{u.name}</span>,
          },
          {
            key: "groups",
            header: "Groups",
            render: (u) => (
              <div className="flex flex-wrap gap-1">
                {u.groups.map((g) => (
                  <span
                    key={g}
                    className="rounded bg-gray-700/50 px-2 py-0.5 text-xs text-gray-300"
                  >
                    {g}
                  </span>
                ))}
              </div>
            ),
          },
          {
            key: "mfa",
            header: "MFA",
            render: (u) =>
              u.mfaEnabled ? (
                <CheckCircle size={16} className="text-emerald-400" />
              ) : (
                <XCircle size={16} className="text-red-400" />
              ),
          },
          {
            key: "keys",
            header: "Access Keys",
            render: (u) => u.accessKeys,
          },
          {
            key: "lastActive",
            header: "Last Active",
            render: (u) => new Date(u.lastActive).toLocaleDateString(),
          },
        ]}
      />
    </div>
  );
}
