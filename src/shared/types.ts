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

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "FATAL";

export type LogEntry = {
  id: string;
  timestamp: string;
  logGroup: string;
  logStream: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  source: string;
};

export type LogGroup = {
  name: string;
  retentionDays: number;
  storedBytes: number;
  streamCount: number;
  lastEvent: string;
};

export type AiLogAnalysis = {
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  rootCause: string;
  recommendation: string;
  relatedPatterns: string[];
};

export type WafRule = {
  id: string;
  name: string;
  priority: number;
  action: "ALLOW" | "BLOCK" | "COUNT";
  type: "RATE_BASED" | "REGULAR" | "MANAGED";
  ruleGroup: string;
  matchesLast24h: number;
  blockRate: number;
  enabled: boolean;
  description: string;
};

export type WafWebAcl = {
  id: string;
  name: string;
  region: string;
  rulesCount: number;
  requestsSampled: number;
  blockedRequests: number;
  allowedRequests: number;
};

export type WafTrafficData = {
  time: string;
  allowed: number;
  blocked: number;
  counted: number;
};

export type WafTopThreat = {
  source: string;
  country: string;
  requests: number;
  blocked: number;
  ruleTriggered: string;
};

export type JenkinsBuildStatus =
  | "SUCCESS"
  | "FAILURE"
  | "UNSTABLE"
  | "ABORTED"
  | "IN_PROGRESS"
  | "QUEUED";

export type JenkinsPipelineStage = {
  name: string;
  status: JenkinsBuildStatus;
  durationMs: number;
};

export type JenkinsBuild = {
  number: number;
  status: JenkinsBuildStatus;
  timestamp: string;
  durationMs: number;
  trigger: string;
  stages: JenkinsPipelineStage[];
};

export type JenkinsJob = {
  name: string;
  fullName: string;
  url: string;
  type: "pipeline" | "multibranch" | "freestyle";
  lastBuild: JenkinsBuild | null;
  healthScore: number;
  enabled: boolean;
  description: string;
};

export type DeployParameter = {
  name: string;
  type: "string" | "choice" | "boolean";
  defaultValue: string;
  description: string;
  choices?: string[];
};

export type DeployConfig = {
  id: string;
  name: string;
  jenkinsJob: string;
  targetEnv: "dev" | "staging" | "prod";
  targetService: string;
  awsRegion: string;
  deployStrategy: "rolling" | "blue-green" | "canary";
  autoApprove: boolean;
  lastDeployed: string | null;
  lastStatus: JenkinsBuildStatus | null;
  parameters: DeployParameter[];
};

export type JenkinsQueueItem = {
  id: number;
  jobName: string;
  reason: string;
  inQueueSince: string;
  estimatedDuration: number;
};

export type JenkinsServerInfo = {
  url: string;
  version: string;
  connected: boolean;
  nodeCount: number;
  executorsBusy: number;
  executorsTotal: number;
  queueLength: number;
};

// ── ECS Types ──────────────────────────────────────────────

export type ECSTaskStatus = "PROVISIONING" | "PENDING" | "RUNNING" | "STOPPING" | "STOPPED";

export type ECSServiceHealth = "HEALTHY" | "ROLLING" | "UNHEALTHY" | "SCALING";

export type ECSDeploymentStatus = "PRIMARY" | "ACTIVE" | "INACTIVE";

export type ECSRolloutState = "IN_PROGRESS" | "COMPLETED" | "FAILED";

export type ECSCluster = {
  name: string;
  arn: string;
  status: "ACTIVE" | "INACTIVE";
  registeredInstances: number;
  runningTasks: number;
  pendingTasks: number;
  activeServices: number;
  cpuReservation: number;
  memoryReservation: number;
  cpuUtilization: number;
  memoryUtilization: number;
};

export type ECSContainer = {
  name: string;
  image: string;
  cpu: number;
  memory: number;
  status: "RUNNING" | "STOPPED" | "PENDING";
  healthStatus: "HEALTHY" | "UNHEALTHY" | "UNKNOWN";
  lastStartedAt: string;
};

export type ECSTask = {
  taskId: string;
  taskDefinition: string;
  serviceName: string;
  clusterName: string;
  status: ECSTaskStatus;
  healthStatus: "HEALTHY" | "UNHEALTHY" | "UNKNOWN";
  cpu: number;
  memory: number;
  cpuUtilization: number;
  memoryUtilization: number;
  containers: ECSContainer[];
  startedAt: string;
  stoppedAt: string | null;
  stoppedReason: string | null;
  launchType: "FARGATE" | "EC2";
  privateIp: string;
};

export type ECSDeployment = {
  id: string;
  status: ECSDeploymentStatus;
  rolloutState: ECSRolloutState;
  taskDefinition: string;
  desiredCount: number;
  runningCount: number;
  pendingCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ECSScalingPolicy = {
  policyName: string;
  metricType: "CPU" | "Memory" | "ALBRequestCount";
  targetValue: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
};

export type ECSService = {
  name: string;
  arn: string;
  clusterName: string;
  status: "ACTIVE" | "DRAINING" | "INACTIVE";
  health: ECSServiceHealth;
  taskDefinition: string;
  desiredCount: number;
  runningCount: number;
  pendingCount: number;
  launchType: "FARGATE" | "EC2";
  deployments: ECSDeployment[];
  loadBalancerTarget: string | null;
  scaling: {
    enabled: boolean;
    minCapacity: number;
    maxCapacity: number;
    policies: ECSScalingPolicy[];
  };
  cpuUtilization: number;
  memoryUtilization: number;
  createdAt: string;
  lastDeployment: string;
  updatedBy: string;
};

export type ECSEvent = {
  id: string;
  timestamp: string;
  serviceName: string;
  clusterName: string;
  message: string;
  type: "DEPLOYMENT" | "SCALING" | "TASK" | "ERROR";
};

// ── Deployment Strategy Types ─────────────────────────────

export type DeployEnvironment = "dev" | "staging" | "prod";

export type DeployStrategyType = "rolling" | "blue-green" | "canary";

export type DeployStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "IN_PROGRESS"
  | "HEALTH_CHECK"
  | "COMPLETED"
  | "FAILED"
  | "ROLLED_BACK"
  | "CANCELLED";

export type DeployPipelineStage = {
  name: string;
  status: DeployStatus | "WAITING" | "SKIPPED";
  startedAt: string | null;
  completedAt: string | null;
  approver: string | null;
  notes: string | null;
};

export type DeployPipeline = {
  id: string;
  name: string;
  service: string;
  version: string;
  imageTag: string;
  strategy: DeployStrategyType;
  currentEnv: DeployEnvironment;
  status: DeployStatus;
  stages: DeployPipelineStage[];
  triggeredBy: string;
  triggeredAt: string;
  completedAt: string | null;
  rollbackVersion: string | null;
  healthChecks: DeployHealthCheck[];
  circuitBreaker: {
    enabled: boolean;
    threshold: number;
    failureCount: number;
    triggered: boolean;
  };
};

export type DeployHealthCheck = {
  name: string;
  endpoint: string;
  status: "PASSING" | "FAILING" | "PENDING";
  responseTime: number | null;
  lastChecked: string | null;
};

export type EnvironmentState = {
  env: DeployEnvironment;
  service: string;
  currentVersion: string;
  imageTag: string;
  deployedAt: string;
  deployedBy: string;
  taskCount: number;
  health: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  lastHealthCheck: string;
};

export type DeploySchedule = {
  id: string;
  name: string;
  service: string;
  targetEnv: DeployEnvironment;
  version: string;
  scheduledFor: string;
  createdBy: string;
  status: "SCHEDULED" | "EXECUTING" | "COMPLETED" | "CANCELLED";
  maintenanceWindow: string;
};

export type DeployRollback = {
  id: string;
  pipelineId: string;
  service: string;
  env: DeployEnvironment;
  fromVersion: string;
  toVersion: string;
  reason: string;
  initiatedBy: string;
  initiatedAt: string;
  completedAt: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
};

// ── Report & Data Source Types ────────────────────────────
export type DataSourceType = "cloudwatch" | "redshift" | "mysql" | "s3" | "csv";
export type DataSourceStatus = "connected" | "disconnected" | "error";
export type VisualizationType = "table" | "bar" | "line" | "pie" | "area" | "scatter";
export type ReportExecutionStatus = "running" | "completed" | "failed";
export type AiAgentType =
  | "log-analysis"
  | "cost-optimization"
  | "infrastructure"
  | "security"
  | "report-builder"
  | "general";
export type ReportCategory = "cost" | "security" | "performance" | "infrastructure" | "logs";
export type WidgetType = "chart" | "table" | "metric" | "status";
