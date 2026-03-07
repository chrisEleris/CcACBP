import type { VPC } from "@shared/types";

export const vpcs: VPC[] = [
  {
    id: "vpc-0abc123def456",
    name: "production",
    cidr: "10.0.0.0/16",
    subnets: 6,
    region: "us-east-1",
    isDefault: false,
  },
  {
    id: "vpc-1def456ghi789",
    name: "staging",
    cidr: "10.1.0.0/16",
    subnets: 4,
    region: "us-east-1",
    isDefault: false,
  },
  {
    id: "vpc-2ghi789jkl012",
    name: "default",
    cidr: "172.31.0.0/16",
    subnets: 3,
    region: "us-east-1",
    isDefault: true,
  },
];
