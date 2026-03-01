import { CheckCircle, Globe, Lock, Plus, Users, XCircle } from "lucide-react";
import { DataTable } from "../components/DataTable";
import { s3Buckets } from "../lib/mock-data";

const accessIcons = {
  private: { icon: <Lock size={14} />, label: "Private", className: "text-gray-400" },
  "public-read": { icon: <Globe size={14} />, label: "Public", className: "text-yellow-400" },
  "authenticated-read": { icon: <Users size={14} />, label: "Auth", className: "text-blue-400" },
};

function formatSize(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  return `${gb.toFixed(1)} GB`;
}

export function S3Page() {
  const totalSize = s3Buckets.reduce((sum, b) => sum + b.sizeGb, 0);
  const totalObjects = s3Buckets.reduce((sum, b) => sum + b.objects, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {s3Buckets.length} buckets — {formatSize(totalSize)} — {totalObjects.toLocaleString()}{" "}
            objects
          </span>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Create Bucket
        </button>
      </div>

      <DataTable
        data={s3Buckets}
        keyExtractor={(b) => b.name}
        columns={[
          {
            key: "name",
            header: "Bucket Name",
            render: (b) => <span className="font-medium text-white">{b.name}</span>,
          },
          { key: "region", header: "Region", render: (b) => b.region },
          {
            key: "size",
            header: "Size",
            render: (b) => formatSize(b.sizeGb),
          },
          {
            key: "objects",
            header: "Objects",
            render: (b) => b.objects.toLocaleString(),
          },
          {
            key: "access",
            header: "Access",
            render: (b) => {
              const config = accessIcons[b.access];
              return (
                <div className={`flex items-center gap-1.5 ${config.className}`}>
                  {config.icon}
                  <span className="text-xs">{config.label}</span>
                </div>
              );
            },
          },
          {
            key: "versioning",
            header: "Versioning",
            render: (b) =>
              b.versioning ? (
                <CheckCircle size={16} className="text-emerald-400" />
              ) : (
                <XCircle size={16} className="text-gray-500" />
              ),
          },
          {
            key: "created",
            header: "Created",
            render: (b) => b.createdAt,
          },
        ]}
      />
    </div>
  );
}
