import type { IAMUser } from "@shared/types";

export const iamUsers: IAMUser[] = [
  {
    name: "admin-chris",
    arn: "arn:aws:iam::123456789012:user/admin-chris",
    groups: ["Administrators", "Billing"],
    mfaEnabled: true,
    lastActive: "2026-03-01T10:30:00Z",
    accessKeys: 1,
  },
  {
    name: "dev-sarah",
    arn: "arn:aws:iam::123456789012:user/dev-sarah",
    groups: ["Developers"],
    mfaEnabled: true,
    lastActive: "2026-02-28T16:45:00Z",
    accessKeys: 2,
  },
  {
    name: "ci-pipeline",
    arn: "arn:aws:iam::123456789012:user/ci-pipeline",
    groups: ["CI-CD"],
    mfaEnabled: false,
    lastActive: "2026-03-01T08:00:00Z",
    accessKeys: 1,
  },
  {
    name: "readonly-auditor",
    arn: "arn:aws:iam::123456789012:user/readonly-auditor",
    groups: ["ReadOnly", "SecurityAudit"],
    mfaEnabled: true,
    lastActive: "2026-02-25T11:00:00Z",
    accessKeys: 0,
  },
  {
    name: "ops-mike",
    arn: "arn:aws:iam::123456789012:user/ops-mike",
    groups: ["Operations", "Developers"],
    mfaEnabled: true,
    lastActive: "2026-03-01T09:15:00Z",
    accessKeys: 1,
  },
];
