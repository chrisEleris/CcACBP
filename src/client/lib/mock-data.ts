export type EC2Instance = {
  id: string;
  name: string;
  type: string;
  state: "running" | "stopped" | "pending" | "terminated";
  az: string;
  publicIp: string;
  privateIp: string;
  cpu: number;
  memory: number;
  launchTime: string;
};

export type S3Bucket = {
  name: string;
  region: string;
  sizeGb: number;
  objects: number;
  access: "private" | "public-read" | "authenticated-read";
  versioning: boolean;
  createdAt: string;
};

export type CloudWatchAlarm = {
  name: string;
  metric: string;
  namespace: string;
  state: "OK" | "ALARM" | "INSUFFICIENT_DATA";
  threshold: string;
  period: string;
};

export type IAMUser = {
  name: string;
  arn: string;
  groups: string[];
  mfaEnabled: boolean;
  lastActive: string;
  accessKeys: number;
};

export type LambdaFunction = {
  name: string;
  runtime: string;
  memory: number;
  timeout: number;
  lastInvoked: string;
  invocations24h: number;
  errors24h: number;
};

export type VPC = {
  id: string;
  name: string;
  cidr: string;
  subnets: number;
  region: string;
  isDefault: boolean;
};

export const ec2Instances: EC2Instance[] = [
  {
    id: "i-0a1b2c3d4e5f6g7h8",
    name: "prod-web-01",
    type: "t3.large",
    state: "running",
    az: "us-east-1a",
    publicIp: "54.210.123.45",
    privateIp: "10.0.1.15",
    cpu: 34,
    memory: 62,
    launchTime: "2026-01-15T08:30:00Z",
  },
  {
    id: "i-1b2c3d4e5f6g7h8i9",
    name: "prod-web-02",
    type: "t3.large",
    state: "running",
    az: "us-east-1b",
    publicIp: "54.210.123.46",
    privateIp: "10.0.2.15",
    cpu: 28,
    memory: 55,
    launchTime: "2026-01-15T08:31:00Z",
  },
  {
    id: "i-2c3d4e5f6g7h8i9j0",
    name: "prod-api-01",
    type: "m5.xlarge",
    state: "running",
    az: "us-east-1a",
    publicIp: "54.210.124.10",
    privateIp: "10.0.1.20",
    cpu: 67,
    memory: 78,
    launchTime: "2026-02-01T12:00:00Z",
  },
  {
    id: "i-3d4e5f6g7h8i9j0k1",
    name: "staging-web-01",
    type: "t3.medium",
    state: "running",
    az: "us-east-1a",
    publicIp: "54.210.125.20",
    privateIp: "10.0.3.10",
    cpu: 12,
    memory: 35,
    launchTime: "2026-02-10T09:00:00Z",
  },
  {
    id: "i-4e5f6g7h8i9j0k1l2",
    name: "dev-worker-01",
    type: "t3.small",
    state: "stopped",
    az: "us-east-1b",
    publicIp: "-",
    privateIp: "10.0.4.5",
    cpu: 0,
    memory: 0,
    launchTime: "2026-01-20T14:00:00Z",
  },
  {
    id: "i-5f6g7h8i9j0k1l2m3",
    name: "bastion-host",
    type: "t3.micro",
    state: "running",
    az: "us-east-1a",
    publicIp: "54.210.126.30",
    privateIp: "10.0.0.10",
    cpu: 5,
    memory: 18,
    launchTime: "2025-12-01T06:00:00Z",
  },
];

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

export const cloudWatchAlarms: CloudWatchAlarm[] = [
  {
    name: "prod-web-high-cpu",
    metric: "CPUUtilization",
    namespace: "AWS/EC2",
    state: "OK",
    threshold: "> 80%",
    period: "5 min",
  },
  {
    name: "prod-api-high-cpu",
    metric: "CPUUtilization",
    namespace: "AWS/EC2",
    state: "ALARM",
    threshold: "> 80%",
    period: "5 min",
  },
  {
    name: "rds-connections",
    metric: "DatabaseConnections",
    namespace: "AWS/RDS",
    state: "OK",
    threshold: "> 100",
    period: "5 min",
  },
  {
    name: "alb-5xx-errors",
    metric: "HTTPCode_Target_5XX",
    namespace: "AWS/ALB",
    state: "ALARM",
    threshold: "> 10",
    period: "1 min",
  },
  {
    name: "lambda-errors",
    metric: "Errors",
    namespace: "AWS/Lambda",
    state: "OK",
    threshold: "> 5",
    period: "5 min",
  },
  {
    name: "s3-bucket-size",
    metric: "BucketSizeBytes",
    namespace: "AWS/S3",
    state: "INSUFFICIENT_DATA",
    threshold: "> 1TB",
    period: "1 day",
  },
];

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

export const lambdaFunctions: LambdaFunction[] = [
  {
    name: "api-auth-handler",
    runtime: "nodejs20.x",
    memory: 256,
    timeout: 30,
    lastInvoked: "2026-03-01T10:45:00Z",
    invocations24h: 45230,
    errors24h: 12,
  },
  {
    name: "image-resize",
    runtime: "nodejs20.x",
    memory: 512,
    timeout: 60,
    lastInvoked: "2026-03-01T10:30:00Z",
    invocations24h: 8920,
    errors24h: 3,
  },
  {
    name: "cron-cleanup",
    runtime: "python3.12",
    memory: 128,
    timeout: 300,
    lastInvoked: "2026-03-01T06:00:00Z",
    invocations24h: 24,
    errors24h: 0,
  },
  {
    name: "webhook-processor",
    runtime: "nodejs20.x",
    memory: 256,
    timeout: 30,
    lastInvoked: "2026-03-01T10:44:00Z",
    invocations24h: 15340,
    errors24h: 45,
  },
];

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

export type CostData = {
  month: string;
  ec2: number;
  s3: number;
  rds: number;
  lambda: number;
  other: number;
};

export const costHistory: CostData[] = [
  { month: "Sep", ec2: 2800, s3: 420, rds: 1200, lambda: 85, other: 650 },
  { month: "Oct", ec2: 2950, s3: 435, rds: 1200, lambda: 92, other: 680 },
  { month: "Nov", ec2: 3100, s3: 450, rds: 1200, lambda: 110, other: 710 },
  { month: "Dec", ec2: 2700, s3: 460, rds: 1200, lambda: 95, other: 690 },
  { month: "Jan", ec2: 3200, s3: 480, rds: 1350, lambda: 120, other: 730 },
  { month: "Feb", ec2: 3150, s3: 495, rds: 1350, lambda: 135, other: 750 },
];

export type MetricDataPoint = {
  time: string;
  value: number;
};

export const cpuMetrics: MetricDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  value: Math.floor(20 + Math.random() * 60),
}));

export const networkMetrics: MetricDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  value: Math.floor(50 + Math.random() * 200),
}));
