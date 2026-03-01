/**
 * Shared types used across server and client.
 */

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type ApiError = {
  message: string;
  status: number;
};

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

export type CostData = {
  month: string;
  ec2: number;
  s3: number;
  rds: number;
  lambda: number;
  other: number;
};

export type MetricDataPoint = {
  time: string;
  value: number;
};
