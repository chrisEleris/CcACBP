import type { AiLogAnalysis, LogEntry, LogGroup } from "@shared/types";

export const logGroups: LogGroup[] = [
  {
    name: "/aws/lambda/api-auth-handler",
    retentionDays: 30,
    storedBytes: 524288000,
    streamCount: 12,
    lastEvent: "2026-03-01T10:58:42.000Z",
  },
  {
    name: "/aws/lambda/image-resize",
    retentionDays: 14,
    storedBytes: 209715200,
    streamCount: 8,
    lastEvent: "2026-03-01T10:55:10.000Z",
  },
  {
    name: "/ecs/prod-web",
    retentionDays: 90,
    storedBytes: 2147483648,
    streamCount: 24,
    lastEvent: "2026-03-01T10:59:01.000Z",
  },
  {
    name: "/aws/apigateway/prod-api",
    retentionDays: 7,
    storedBytes: 104857600,
    streamCount: 4,
    lastEvent: "2026-03-01T10:57:33.000Z",
  },
  {
    name: "/aws/waf/prod-acl",
    retentionDays: 30,
    storedBytes: 314572800,
    streamCount: 2,
    lastEvent: "2026-03-01T10:58:55.000Z",
  },
];

export const logEntries: LogEntry[] = [
  {
    id: "log-001",
    timestamp: "2026-03-01T10:58:42.345Z",
    logGroup: "/aws/lambda/api-auth-handler",
    logStream: "2026/03/01/[$LATEST]a1b2c3d4e5f6",
    level: "ERROR",
    message: "Task timed out after 30.01 seconds",
    requestId: "f3a1b2c3-d4e5-f6a7-b8c9-d0e1f2a3b4c5",
    source: "api-auth-handler",
  },
  {
    id: "log-002",
    timestamp: "2026-03-01T10:57:18.112Z",
    logGroup: "/aws/lambda/api-auth-handler",
    logStream: "2026/03/01/[$LATEST]a1b2c3d4e5f6",
    level: "WARN",
    message: "Cold start detected — init duration 1234ms. Consider provisioned concurrency.",
    requestId: "a9b8c7d6-e5f4-a3b2-c1d0-e9f8a7b6c5d4",
    source: "api-auth-handler",
  },
  {
    id: "log-003",
    timestamp: "2026-03-01T10:56:05.889Z",
    logGroup: "/aws/lambda/api-auth-handler",
    logStream: "2026/03/01/[$LATEST]a1b2c3d4e5f6",
    level: "INFO",
    message: "START RequestId: c3d4e5f6-a7b8-c9d0-e1f2-a3b4c5d6e7f8 Version: $LATEST",
    requestId: "c3d4e5f6-a7b8-c9d0-e1f2-a3b4c5d6e7f8",
    source: "api-auth-handler",
  },
  {
    id: "log-004",
    timestamp: "2026-03-01T10:55:59.001Z",
    logGroup: "/aws/lambda/api-auth-handler",
    logStream: "2026/03/01/[$LATEST]a1b2c3d4e5f6",
    level: "FATAL",
    message:
      "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory. Memory limit 256 MB exceeded.",
    requestId: "d4e5f6a7-b8c9-d0e1-f2a3-b4c5d6e7f8a9",
    source: "api-auth-handler",
  },
  {
    id: "log-005",
    timestamp: "2026-03-01T10:54:22.774Z",
    logGroup: "/aws/lambda/image-resize",
    logStream: "2026/03/01/[$LATEST]b2c3d4e5f6a7",
    level: "INFO",
    message:
      "Image resize complete: input=s3://prod-assets-cdn/uploads/photo-4928.jpg output=s3://prod-assets-cdn/thumbnails/photo-4928_thumb.jpg duration=340ms",
    requestId: "e5f6a7b8-c9d0-e1f2-a3b4-c5d6e7f8a9b0",
    source: "image-resize",
  },
  {
    id: "log-006",
    timestamp: "2026-03-01T10:53:10.330Z",
    logGroup: "/aws/lambda/image-resize",
    logStream: "2026/03/01/[$LATEST]b2c3d4e5f6a7",
    level: "WARN",
    message:
      "Unsupported image format HEIC detected, falling back to ImageMagick conversion — this may be slower.",
    requestId: "f6a7b8c9-d0e1-f2a3-b4c5-d6e7f8a9b0c1",
    source: "image-resize",
  },
  {
    id: "log-007",
    timestamp: "2026-03-01T10:52:44.002Z",
    logGroup: "/aws/lambda/image-resize",
    logStream: "2026/03/01/[$LATEST]b2c3d4e5f6a7",
    level: "ERROR",
    message:
      "Failed to read source object: NoSuchKey: The specified key does not exist. Key=uploads/missing-asset.png",
    requestId: "a7b8c9d0-e1f2-a3b4-c5d6-e7f8a9b0c1d2",
    source: "image-resize",
  },
  {
    id: "log-008",
    timestamp: "2026-03-01T10:51:30.500Z",
    logGroup: "/ecs/prod-web",
    logStream: "ecs/prod-web-01/d4e5f6a7b8c9d0e1",
    level: "INFO",
    message:
      "Health check passed: GET /health HTTP/1.1 200 OK — upstream: 10.0.1.15:8080 response_time=12ms",
    source: "prod-web",
  },
  {
    id: "log-009",
    timestamp: "2026-03-01T10:50:15.991Z",
    logGroup: "/ecs/prod-web",
    logStream: "ecs/prod-web-02/e5f6a7b8c9d0e1f2",
    level: "WARN",
    message:
      "Container prod-web-02 memory usage at 89% (1.8GB/2GB). Consider scaling or increasing task definition memory.",
    source: "prod-web",
  },
  {
    id: "log-010",
    timestamp: "2026-03-01T10:49:03.218Z",
    logGroup: "/ecs/prod-web",
    logStream: "ecs/prod-web-01/d4e5f6a7b8c9d0e1",
    level: "ERROR",
    message:
      "Container exited with code 137 (OOMKilled). Task arn:aws:ecs:us-east-1:123456789012:task/prod/f1a2b3 stopped.",
    source: "prod-web",
  },
  {
    id: "log-011",
    timestamp: "2026-03-01T10:48:50.667Z",
    logGroup: "/ecs/prod-web",
    logStream: "ecs/prod-web-01/d4e5f6a7b8c9d0e1",
    level: "INFO",
    message:
      "New task started: arn:aws:ecs:us-east-1:123456789012:task/prod/g2b3c4. Pulling image.",
    source: "prod-web",
  },
  {
    id: "log-012",
    timestamp: "2026-03-01T10:47:22.445Z",
    logGroup: "/aws/apigateway/prod-api",
    logStream: "prod-api/2026/03/01",
    level: "ERROR",
    message:
      "HTTP 502 Bad Gateway: Integration response timeout after 29000ms. Route=POST /api/v2/orders Integration=Lambda:webhook-processor",
    requestId: "b8c9d0e1-f2a3-b4c5-d6e7-f8a9b0c1d2e3",
    source: "apigateway",
  },
  {
    id: "log-013",
    timestamp: "2026-03-01T10:46:14.882Z",
    logGroup: "/aws/apigateway/prod-api",
    logStream: "prod-api/2026/03/01",
    level: "WARN",
    message:
      "HTTP 429 Too Many Requests: throttling limit exceeded for stage prod. Client IP=203.0.113.42 Usage=5000/5000 per minute.",
    requestId: "c9d0e1f2-a3b4-c5d6-e7f8-a9b0c1d2e3f4",
    source: "apigateway",
  },
  {
    id: "log-014",
    timestamp: "2026-03-01T10:45:55.119Z",
    logGroup: "/aws/apigateway/prod-api",
    logStream: "prod-api/2026/03/01",
    level: "INFO",
    message:
      "HTTP 200 OK: GET /api/v2/users/me route=prod-api latency=43ms requestId=d0e1f2a3-b4c5-d6e7-f8a9-b0c1d2e3f4a5",
    requestId: "d0e1f2a3-b4c5-d6e7-f8a9-b0c1d2e3f4a5",
    source: "apigateway",
  },
  {
    id: "log-015",
    timestamp: "2026-03-01T10:44:38.300Z",
    logGroup: "/aws/waf/prod-acl",
    logStream: "waf/prod-acl/2026/03/01",
    level: "WARN",
    message:
      "WAF BLOCK: Rule=AWSManagedRulesSQLiRuleSet/SQLi_BODY action=BLOCK ip=45.227.255.100 country=CN uri=/api/v2/search?q=1%27+OR+1%3D1--",
    source: "waf",
  },
  {
    id: "log-016",
    timestamp: "2026-03-01T10:43:20.778Z",
    logGroup: "/aws/waf/prod-acl",
    logStream: "waf/prod-acl/2026/03/01",
    level: "WARN",
    message:
      "WAF BLOCK: Rule=RateLimitRule action=BLOCK ip=198.51.100.77 country=RU requests=2001 window=5min threshold=2000",
    source: "waf",
  },
  {
    id: "log-017",
    timestamp: "2026-03-01T10:42:05.554Z",
    logGroup: "/aws/waf/prod-acl",
    logStream: "waf/prod-acl/2026/03/01",
    level: "INFO",
    message:
      "WAF ALLOW: Rule=AWSManagedRulesCommonRuleSet/None action=ALLOW ip=1.2.3.4 country=US uri=/api/v2/products",
    source: "waf",
  },
  {
    id: "log-018",
    timestamp: "2026-03-01T10:40:59.001Z",
    logGroup: "/aws/lambda/api-auth-handler",
    logStream: "2026/03/01/[$LATEST]a1b2c3d4e5f6",
    level: "DEBUG",
    message:
      "JWT validation: token_exp=2026-03-01T11:40:59Z now=2026-03-01T10:40:59Z valid=true sub=user_8f2a3b4c",
    requestId: "e1f2a3b4-c5d6-e7f8-a9b0-c1d2e3f4a5b6",
    source: "api-auth-handler",
  },
  {
    id: "log-019",
    timestamp: "2026-03-01T10:39:44.123Z",
    logGroup: "/ecs/prod-web",
    logStream: "ecs/prod-web-02/e5f6a7b8c9d0e1f2",
    level: "DEBUG",
    message:
      "nginx upstream keepalive: pool=10.0.1.20:8080 active=42 idle=8 waiting=0 accepts=18920 handled=18920 requests=104382",
    source: "prod-web",
  },
  {
    id: "log-020",
    timestamp: "2026-03-01T10:38:30.900Z",
    logGroup: "/aws/lambda/api-auth-handler",
    logStream: "2026/03/01/[$LATEST]a1b2c3d4e5f6",
    level: "INFO",
    message:
      "END RequestId: f2a3b4c5-d6e7-f8a9-b0c1-d2e3f4a5b6c7 Duration: 245.32 ms Billed Duration: 246 ms Memory Size: 256 MB Max Memory Used: 178 MB",
    requestId: "f2a3b4c5-d6e7-f8a9-b0c1-d2e3f4a5b6c7",
    source: "api-auth-handler",
  },
  {
    id: "log-021",
    timestamp: "2026-03-01T10:37:12.445Z",
    logGroup: "/aws/apigateway/prod-api",
    logStream: "prod-api/2026/03/01",
    level: "ERROR",
    message:
      "HTTP 500 Internal Server Error: Unhandled exception in Lambda integration. Check CloudWatch logs for function api-auth-handler. requestId=a3b4c5d6-e7f8-a9b0-c1d2-e3f4a5b6c7d8",
    requestId: "a3b4c5d6-e7f8-a9b0-c1d2-e3f4a5b6c7d8",
    source: "apigateway",
  },
  {
    id: "log-022",
    timestamp: "2026-03-01T10:35:00.000Z",
    logGroup: "/ecs/prod-web",
    logStream: "ecs/prod-web-01/d4e5f6a7b8c9d0e1",
    level: "WARN",
    message:
      "Slow response detected: POST /api/v2/checkout upstream=10.0.1.15:8080 response_time=4821ms threshold=2000ms",
    source: "prod-web",
  },
];

export const aiLogAnalysis: AiLogAnalysis = {
  summary:
    "Multiple critical issues detected in the last 2 hours. A Lambda OOM crash on api-auth-handler is causing cascading 500 errors through API Gateway. ECS container instability (OOMKilled exit code 137) suggests insufficient memory allocation across the board.",
  severity: "critical",
  rootCause:
    "Memory pressure across compute resources. Lambda function api-auth-handler is running at the 256 MB limit with peak usage at 178 MB, leaving minimal headroom. The ECS prod-web task is consistently hitting 89%+ memory utilization, triggering kernel OOM killer. These are likely correlated with the observed traffic spike.",
  recommendation:
    "Immediately increase Lambda memory to 512 MB and ECS task definition memory to 3 GB. Enable Lambda Provisioned Concurrency to eliminate cold starts. Set up CloudWatch alarms for memory utilization > 80%. Consider enabling auto-scaling for the ECS service based on memory metrics.",
  relatedPatterns: [
    "OOM errors correlate with traffic peaks between 10:45–11:00 UTC",
    "Cold start warning on api-auth-handler suggests burst traffic",
    "API Gateway 502s are downstream symptoms of Lambda timeouts",
    "WAF rate limiting indicates potential DDoS or scraping activity",
    "image-resize errors on missing S3 keys suggest stale reference data",
  ],
};
