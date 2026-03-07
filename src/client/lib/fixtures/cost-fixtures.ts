import type { CostData } from "@shared/types";

export const costHistory: CostData[] = [
  { month: "Sep", ec2: 2800, s3: 420, rds: 1200, lambda: 85, other: 650 },
  { month: "Oct", ec2: 2950, s3: 435, rds: 1200, lambda: 92, other: 680 },
  { month: "Nov", ec2: 3100, s3: 450, rds: 1200, lambda: 110, other: 710 },
  { month: "Dec", ec2: 2700, s3: 460, rds: 1200, lambda: 95, other: 690 },
  { month: "Jan", ec2: 3200, s3: 480, rds: 1350, lambda: 120, other: 730 },
  { month: "Feb", ec2: 3150, s3: 495, rds: 1350, lambda: 135, other: 750 },
];
