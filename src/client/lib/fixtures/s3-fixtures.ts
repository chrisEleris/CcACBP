import type { S3Bucket } from "@shared/types";

export const s3Buckets: S3Bucket[] = [
  {
    name: "prod-assets-cdn",
    region: "us-east-1",
    sizeGb: 245.8,
    objects: 128430,
    access: "public-read",
    versioning: true,
    createdAt: "2025-06-15",
  },
  {
    name: "prod-backups",
    region: "us-east-1",
    sizeGb: 1024.5,
    objects: 3521,
    access: "private",
    versioning: true,
    createdAt: "2025-03-20",
  },
  {
    name: "app-logs-archive",
    region: "us-east-1",
    sizeGb: 512.3,
    objects: 45890,
    access: "private",
    versioning: false,
    createdAt: "2025-07-10",
  },
  {
    name: "staging-uploads",
    region: "us-east-1",
    sizeGb: 18.7,
    objects: 2340,
    access: "authenticated-read",
    versioning: true,
    createdAt: "2025-09-01",
  },
  {
    name: "terraform-state",
    region: "us-east-1",
    sizeGb: 0.1,
    objects: 45,
    access: "private",
    versioning: true,
    createdAt: "2025-01-10",
  },
];
