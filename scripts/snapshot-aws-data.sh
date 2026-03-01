#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# snapshot-aws-data.sh
#
# Queries your live AWS account and generates mock-data.ts with
# real resource data for local dev and GitHub Pages static builds.
#
# Prerequisites:
#   - AWS CLI v2 configured (aws configure / env vars / SSO)
#   - jq installed
#
# Usage:
#   chmod +x scripts/snapshot-aws-data.sh
#   ./scripts/snapshot-aws-data.sh
#   # or specify a region:
#   AWS_REGION=us-east-1 ./scripts/snapshot-aws-data.sh
# ──────────────────────────────────────────────────────────────
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
OUT="src/client/lib/mock-data.ts"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "▸ Region: $REGION"
echo "▸ Output: $OUT"
echo ""

# ── helper: safe jq that returns fallback on empty/null ──────
safe() { jq -r "$1 // \"$2\"" 2>/dev/null || echo "$2"; }

# ────────────────────────────────────────────────────────────
# 1. EC2 INSTANCES
# ────────────────────────────────────────────────────────────
echo "  Fetching EC2 instances..."
aws ec2 describe-instances --region "$REGION" --output json > "$TMP/ec2.json" 2>/dev/null || echo '{"Reservations":[]}' > "$TMP/ec2.json"

EC2_TS=$(jq -r '
  [.Reservations[].Instances[] |
    {
      id: (.InstanceId // "unknown"),
      name: ((.Tags // [] | map(select(.Key == "Name")) | .[0].Value) // .InstanceId // "unnamed"),
      type: (.InstanceType // "unknown"),
      state: (if .State.Name == "running" or .State.Name == "stopped" or .State.Name == "pending" or .State.Name == "terminated" then .State.Name else "terminated" end),
      az: (.Placement.AvailabilityZone // "-"),
      publicIp: (.PublicIpAddress // "-"),
      privateIp: (.PrivateIpAddress // "-"),
      cpu: 0,
      memory: 0,
      launchTime: (.LaunchTime // "1970-01-01T00:00:00Z")
    }
  ] | if length == 0 then "[]" else . end
' "$TMP/ec2.json")

# ────────────────────────────────────────────────────────────
# 2. S3 BUCKETS
# ────────────────────────────────────────────────────────────
echo "  Fetching S3 buckets..."
aws s3api list-buckets --output json > "$TMP/s3.json" 2>/dev/null || echo '{"Buckets":[]}' > "$TMP/s3.json"

# Get versioning status for each bucket (best effort)
S3_BUCKETS=$(jq -r '.Buckets // [] | map(.Name) | .[]' "$TMP/s3.json")
echo '[]' > "$TMP/s3_enriched.json"

for BUCKET in $S3_BUCKETS; do
  VERSIONING=$(aws s3api get-bucket-versioning --bucket "$BUCKET" --output json 2>/dev/null | jq -r '.Status // "Disabled"' || echo "Disabled")
  IS_VERSIONED="false"
  [ "$VERSIONING" = "Enabled" ] && IS_VERSIONED="true"

  BUCKET_REGION=$(aws s3api get-bucket-location --bucket "$BUCKET" --output json 2>/dev/null | jq -r '.LocationConstraint // "us-east-1"' || echo "$REGION")
  [ "$BUCKET_REGION" = "null" ] && BUCKET_REGION="us-east-1"

  CREATED=$(jq -r --arg name "$BUCKET" '.Buckets[] | select(.Name == $name) | .CreationDate // "1970-01-01T00:00:00Z"' "$TMP/s3.json")

  jq --arg name "$BUCKET" --arg region "$BUCKET_REGION" --argjson versioning "$IS_VERSIONED" --arg created "$CREATED" \
    '. += [{name: $name, region: $region, sizeGb: 0, objects: 0, access: "private", versioning: $versioning, createdAt: $created}]' \
    "$TMP/s3_enriched.json" > "$TMP/s3_enriched_tmp.json" && mv "$TMP/s3_enriched_tmp.json" "$TMP/s3_enriched.json"
done

S3_TS=$(cat "$TMP/s3_enriched.json")

# ────────────────────────────────────────────────────────────
# 3. CLOUDWATCH ALARMS
# ────────────────────────────────────────────────────────────
echo "  Fetching CloudWatch alarms..."
aws cloudwatch describe-alarms --region "$REGION" --output json > "$TMP/cw.json" 2>/dev/null || echo '{"MetricAlarms":[]}' > "$TMP/cw.json"

CW_TS=$(jq '
  [.MetricAlarms[] |
    {
      name: (.AlarmName // "unknown"),
      metric: (.MetricName // "unknown"),
      namespace: (.Namespace // "unknown"),
      state: (if .StateValue == "OK" or .StateValue == "ALARM" or .StateValue == "INSUFFICIENT_DATA" then .StateValue else "INSUFFICIENT_DATA" end),
      threshold: ((.Threshold // 0) | tostring),
      period: ((.Period // 0) | tostring)
    }
  ]
' "$TMP/cw.json")

# ────────────────────────────────────────────────────────────
# 4. IAM USERS
# ────────────────────────────────────────────────────────────
echo "  Fetching IAM users..."
aws iam list-users --output json > "$TMP/iam.json" 2>/dev/null || echo '{"Users":[]}' > "$TMP/iam.json"

echo '[]' > "$TMP/iam_enriched.json"
for USER_NAME in $(jq -r '.Users[].UserName' "$TMP/iam.json"); do
  ARN=$(jq -r --arg u "$USER_NAME" '.Users[] | select(.UserName == $u) | .Arn // ""' "$TMP/iam.json")
  LAST_ACTIVE=$(jq -r --arg u "$USER_NAME" '.Users[] | select(.UserName == $u) | .PasswordLastUsed // "Never"' "$TMP/iam.json")

  MFA_COUNT=$(aws iam list-mfa-devices --user-name "$USER_NAME" --output json 2>/dev/null | jq '.MFADevices | length' || echo 0)
  MFA_ENABLED="false"
  [ "$MFA_COUNT" -gt 0 ] 2>/dev/null && MFA_ENABLED="true"

  ACCESS_KEYS=$(aws iam list-access-keys --user-name "$USER_NAME" --output json 2>/dev/null | jq '.AccessKeyMetadata | length' || echo 0)

  GROUPS=$(aws iam list-groups-for-user --user-name "$USER_NAME" --output json 2>/dev/null | jq '[.Groups[].GroupName]' || echo '[]')

  jq --arg name "$USER_NAME" --arg arn "$ARN" --arg last "$LAST_ACTIVE" --argjson mfa "$MFA_ENABLED" --argjson keys "$ACCESS_KEYS" --argjson groups "$GROUPS" \
    '. += [{name: $name, arn: $arn, groups: $groups, mfaEnabled: $mfa, lastActive: $last, accessKeys: $keys}]' \
    "$TMP/iam_enriched.json" > "$TMP/iam_tmp.json" && mv "$TMP/iam_tmp.json" "$TMP/iam_enriched.json"
done

IAM_TS=$(cat "$TMP/iam_enriched.json")

# ────────────────────────────────────────────────────────────
# 5. LAMBDA FUNCTIONS
# ────────────────────────────────────────────────────────────
echo "  Fetching Lambda functions..."
aws lambda list-functions --region "$REGION" --output json > "$TMP/lambda.json" 2>/dev/null || echo '{"Functions":[]}' > "$TMP/lambda.json"

LAMBDA_TS=$(jq '
  [.Functions[] |
    {
      name: (.FunctionName // "unknown"),
      runtime: (.Runtime // "unknown"),
      memory: (.MemorySize // 128),
      timeout: (.Timeout // 3),
      lastInvoked: (.LastModified // "1970-01-01T00:00:00Z"),
      invocations24h: 0,
      errors24h: 0
    }
  ]
' "$TMP/lambda.json")

# ────────────────────────────────────────────────────────────
# 6. VPCs
# ────────────────────────────────────────────────────────────
echo "  Fetching VPCs..."
aws ec2 describe-vpcs --region "$REGION" --output json > "$TMP/vpcs.json" 2>/dev/null || echo '{"Vpcs":[]}' > "$TMP/vpcs.json"
aws ec2 describe-subnets --region "$REGION" --output json > "$TMP/subnets.json" 2>/dev/null || echo '{"Subnets":[]}' > "$TMP/subnets.json"

VPC_TS=$(jq --slurpfile subnets "$TMP/subnets.json" '
  [.Vpcs[] |
    . as $vpc |
    {
      id: (.VpcId // "unknown"),
      name: ((.Tags // [] | map(select(.Key == "Name")) | .[0].Value) // .VpcId // "unnamed"),
      cidr: (.CidrBlock // "0.0.0.0/0"),
      subnets: ([$subnets[0].Subnets[] | select(.VpcId == $vpc.VpcId)] | length),
      region: "'"$REGION"'",
      isDefault: (.IsDefault // false)
    }
  ]
' "$TMP/vpcs.json")

# ────────────────────────────────────────────────────────────
# 7. COST EXPLORER (last 6 months)
# ────────────────────────────────────────────────────────────
echo "  Fetching Cost Explorer data (last 6 months)..."
END_DATE=$(date -u +%Y-%m-01)
START_DATE=$(date -u -d "6 months ago" +%Y-%m-01 2>/dev/null || date -u -v-6m +%Y-%m-01 2>/dev/null || echo "2025-09-01")

aws ce get-cost-and-usage \
  --region "$REGION" \
  --time-period "Start=$START_DATE,End=$END_DATE" \
  --granularity MONTHLY \
  --group-by Type=DIMENSION,Key=SERVICE \
  --metrics BlendedCost \
  --output json > "$TMP/costs.json" 2>/dev/null || echo '{"ResultsByTime":[]}' > "$TMP/costs.json"

COST_TS=$(jq '
  def month_abbr:
    split("-") | .[1] |
    if . == "01" then "Jan"
    elif . == "02" then "Feb"
    elif . == "03" then "Mar"
    elif . == "04" then "Apr"
    elif . == "05" then "May"
    elif . == "06" then "Jun"
    elif . == "07" then "Jul"
    elif . == "08" then "Aug"
    elif . == "09" then "Sep"
    elif . == "10" then "Oct"
    elif . == "11" then "Nov"
    elif . == "12" then "Dec"
    else "?" end;

  def categorize:
    if . | test("Elastic Compute") then "ec2"
    elif . | test("Simple Storage") then "s3"
    elif . | test("Relational Database") then "rds"
    elif . | test("Lambda") then "lambda"
    else "other" end;

  [.ResultsByTime[] |
    (.TimePeriod.Start) as $start |
    (reduce (.Groups[]? // empty) as $g (
      {month: ($start | month_abbr), ec2: 0, s3: 0, rds: 0, lambda: 0, other: 0};
      ($g.Keys[0] // "" | categorize) as $cat |
      ($g.Metrics.BlendedCost.Amount // "0" | tonumber | . * 100 | round / 100) as $amt |
      .[$cat] += $amt
    ))
  ] | map(.ec2 = (.ec2 * 100 | round / 100) | .s3 = (.s3 * 100 | round / 100) | .rds = (.rds * 100 | round / 100) | .lambda = (.lambda * 100 | round / 100) | .other = (.other * 100 | round / 100))
' "$TMP/costs.json")

# ────────────────────────────────────────────────────────────
# 8. CLOUDWATCH METRICS (CPU + Network for past 24h)
# ────────────────────────────────────────────────────────────
echo "  Fetching CloudWatch CPU metrics..."
NOW=$(date -u +%Y-%m-%dT%H:00:00Z)
AGO_24H=$(date -u -d "24 hours ago" +%Y-%m-%dT%H:00:00Z 2>/dev/null || date -u -v-24H +%Y-%m-%dT%H:00:00Z 2>/dev/null || echo "2026-02-28T00:00:00Z")

# Try to get ECS CPU metrics first, fall back to EC2
aws cloudwatch get-metric-statistics \
  --region "$REGION" \
  --namespace "AWS/ECS" \
  --metric-name CPUUtilization \
  --start-time "$AGO_24H" \
  --end-time "$NOW" \
  --period 3600 \
  --statistics Average \
  --output json > "$TMP/cpu_raw.json" 2>/dev/null || echo '{"Datapoints":[]}' > "$TMP/cpu_raw.json"

CPU_COUNT=$(jq '.Datapoints | length' "$TMP/cpu_raw.json")
if [ "$CPU_COUNT" -eq 0 ]; then
  aws cloudwatch get-metric-statistics \
    --region "$REGION" \
    --namespace "AWS/EC2" \
    --metric-name CPUUtilization \
    --start-time "$AGO_24H" \
    --end-time "$NOW" \
    --period 3600 \
    --statistics Average \
    --output json > "$TMP/cpu_raw.json" 2>/dev/null || echo '{"Datapoints":[]}' > "$TMP/cpu_raw.json"
fi

CPU_TS=$(jq '
  [.Datapoints | sort_by(.Timestamp) | .[] |
    {
      time: (.Timestamp | split("T") | .[1] | split(":") | .[0:2] | join(":")),
      value: ((.Average // 0) * 100 | round / 100)
    }
  ] | if length == 0 then
    [range(24) | {time: (. | tostring | if length == 1 then "0" + . else . end) + ":00", value: 0}]
  else . end
' "$TMP/cpu_raw.json")

echo "  Fetching CloudWatch network metrics..."
aws cloudwatch get-metric-statistics \
  --region "$REGION" \
  --namespace "AWS/EC2" \
  --metric-name NetworkIn \
  --start-time "$AGO_24H" \
  --end-time "$NOW" \
  --period 3600 \
  --statistics Average \
  --output json > "$TMP/net_raw.json" 2>/dev/null || echo '{"Datapoints":[]}' > "$TMP/net_raw.json"

NET_TS=$(jq '
  [.Datapoints | sort_by(.Timestamp) | .[] |
    {
      time: (.Timestamp | split("T") | .[1] | split(":") | .[0:2] | join(":")),
      value: ((.Average // 0) / 1048576 * 100 | round / 100)
    }
  ] | if length == 0 then
    [range(24) | {time: (. | tostring | if length == 1 then "0" + . else . end) + ":00", value: 0}]
  else . end
' "$TMP/net_raw.json")

# ────────────────────────────────────────────────────────────
# 9. CLOUDWATCH LOG GROUPS
# ────────────────────────────────────────────────────────────
echo "  Fetching CloudWatch Log Groups..."
aws logs describe-log-groups --region "$REGION" --output json > "$TMP/loggroups.json" 2>/dev/null || echo '{"logGroups":[]}' > "$TMP/loggroups.json"

LOGGROUPS_TS=$(jq '
  [.logGroups[] |
    {
      name: (.logGroupName // "unknown"),
      retentionDays: (.retentionInDays // 0),
      storedBytes: (.storedBytes // 0),
      streamCount: 0,
      lastEvent: (if .creationTime then (.creationTime / 1000 | todate) else "1970-01-01T00:00:00Z" end)
    }
  ]
' "$TMP/loggroups.json")

# ────────────────────────────────────────────────────────────
# 10. RECENT LOG ENTRIES (from first available log group)
# ────────────────────────────────────────────────────────────
echo "  Fetching recent log entries..."
FIRST_LOG_GROUP=$(jq -r '.logGroups[0].logGroupName // ""' "$TMP/loggroups.json")
if [ -n "$FIRST_LOG_GROUP" ]; then
  LOGS_START=$(date -u -d "1 hour ago" +%s000 2>/dev/null || date -u -v-1H +%s000 2>/dev/null || echo "0")
  aws logs filter-log-events \
    --region "$REGION" \
    --log-group-name "$FIRST_LOG_GROUP" \
    --start-time "$LOGS_START" \
    --limit 20 \
    --output json > "$TMP/logentries.json" 2>/dev/null || echo '{"events":[]}' > "$TMP/logentries.json"
else
  echo '{"events":[]}' > "$TMP/logentries.json"
fi

LOGENTRIES_TS=$(jq --arg lg "$FIRST_LOG_GROUP" '
  def detect_level:
    if test("ERROR|Exception|FATAL"; "i") then "ERROR"
    elif test("WARN"; "i") then "WARN"
    elif test("DEBUG"; "i") then "DEBUG"
    else "INFO" end;

  [.events[:20] | .[] |
    {
      id: (.eventId // "unknown"),
      timestamp: (if .timestamp then (.timestamp / 1000 | todate) else "1970-01-01T00:00:00Z" end),
      logGroup: $lg,
      logStream: (.logStreamName // "unknown"),
      level: ((.message // "") | detect_level),
      message: (.message // ""),
      source: $lg
    }
  ]
' "$TMP/logentries.json")

# ────────────────────────────────────────────────────────────
# 11. ECS CLUSTERS
# ────────────────────────────────────────────────────────────
echo "  Fetching ECS clusters..."
aws ecs list-clusters --region "$REGION" --output json > "$TMP/ecs_list.json" 2>/dev/null || echo '{"clusterArns":[]}' > "$TMP/ecs_list.json"

CLUSTER_ARNS=$(jq -r '.clusterArns[]' "$TMP/ecs_list.json" 2>/dev/null || true)
if [ -n "$CLUSTER_ARNS" ]; then
  aws ecs describe-clusters --region "$REGION" --clusters $CLUSTER_ARNS --include STATISTICS --output json > "$TMP/ecs_clusters.json" 2>/dev/null || echo '{"clusters":[]}' > "$TMP/ecs_clusters.json"
else
  echo '{"clusters":[]}' > "$TMP/ecs_clusters.json"
fi

ECS_CLUSTERS_TS=$(jq '
  [.clusters[] |
    {
      name: (.clusterName // "unknown"),
      arn: (.clusterArn // ""),
      status: (if .status == "INACTIVE" then "INACTIVE" else "ACTIVE" end),
      registeredInstances: (.registeredContainerInstancesCount // 0),
      runningTasks: (.runningTasksCount // 0),
      pendingTasks: (.pendingTasksCount // 0),
      activeServices: (.activeServicesCount // 0),
      cpuReservation: 0,
      memoryReservation: 0,
      cpuUtilization: 0,
      memoryUtilization: 0
    }
  ]
' "$TMP/ecs_clusters.json")

# ────────────────────────────────────────────────────────────
# 12. ECS SERVICES (for each cluster)
# ────────────────────────────────────────────────────────────
echo "  Fetching ECS services..."
echo '[]' > "$TMP/ecs_services.json"
echo '[]' > "$TMP/ecs_events.json"

for CLUSTER_ARN in $CLUSTER_ARNS; do
  CLUSTER_NAME=$(echo "$CLUSTER_ARN" | awk -F/ '{print $NF}')

  SVC_ARNS=$(aws ecs list-services --region "$REGION" --cluster "$CLUSTER_ARN" --output json 2>/dev/null | jq -r '.serviceArns[]' 2>/dev/null || true)
  if [ -n "$SVC_ARNS" ]; then
    aws ecs describe-services --region "$REGION" --cluster "$CLUSTER_ARN" --services $SVC_ARNS --output json > "$TMP/ecs_svc_detail.json" 2>/dev/null || echo '{"services":[]}' > "$TMP/ecs_svc_detail.json"

    # Extract services
    jq --arg cn "$CLUSTER_NAME" '
      [.services[] |
        {
          name: (.serviceName // "unknown"),
          arn: (.serviceArn // ""),
          clusterName: $cn,
          status: (if .status == "DRAINING" then "DRAINING" elif .status == "INACTIVE" then "INACTIVE" else "ACTIVE" end),
          health: (
            if (.runningCount // 0) == (.desiredCount // 0) and (.desiredCount // 0) > 0 then "HEALTHY"
            elif (.runningCount // 0) == 0 then "UNHEALTHY"
            elif (.runningCount // 0) < (.desiredCount // 0) then "ROLLING"
            else "HEALTHY" end
          ),
          taskDefinition: (.taskDefinition // ""),
          desiredCount: (.desiredCount // 0),
          runningCount: (.runningCount // 0),
          pendingCount: (.pendingCount // 0),
          launchType: (if .launchType == "EC2" then "EC2" else "FARGATE" end),
          deployments: [.deployments[]? | {
            id: (.id // "unknown"),
            status: (if .status == "ACTIVE" then "ACTIVE" elif .status == "INACTIVE" then "INACTIVE" else "PRIMARY" end),
            rolloutState: (if .rolloutState == "FAILED" then "FAILED" elif .rolloutState == "IN_PROGRESS" then "IN_PROGRESS" else "COMPLETED" end),
            taskDefinition: (.taskDefinition // ""),
            desiredCount: (.desiredCount // 0),
            runningCount: (.runningCount // 0),
            pendingCount: (.pendingCount // 0),
            createdAt: (.createdAt // "1970-01-01T00:00:00Z"),
            updatedAt: (.updatedAt // "1970-01-01T00:00:00Z")
          }],
          loadBalancerTarget: (if .loadBalancers | length > 0 then .loadBalancers[0].targetGroupArn else null end),
          scaling: {enabled: false, minCapacity: 1, maxCapacity: 1, policies: []},
          cpuUtilization: 0,
          memoryUtilization: 0,
          createdAt: (.createdAt // "1970-01-01T00:00:00Z"),
          lastDeployment: ((.deployments[0].createdAt) // "1970-01-01T00:00:00Z"),
          updatedBy: "terraform"
        }
      ]
    ' "$TMP/ecs_svc_detail.json" > "$TMP/ecs_svc_batch.json"

    jq -s '.[0] + .[1]' "$TMP/ecs_services.json" "$TMP/ecs_svc_batch.json" > "$TMP/ecs_svc_merged.json" && mv "$TMP/ecs_svc_merged.json" "$TMP/ecs_services.json"

    # Extract events from services
    jq --arg cn "$CLUSTER_NAME" '
      [.services[].events[:5]? // [] | .[] |
        {
          id: (.id // "unknown"),
          timestamp: (.createdAt // "1970-01-01T00:00:00Z"),
          serviceName: "unknown",
          clusterName: $cn,
          message: (.message // ""),
          type: (
            if (.message // "" | test("deploy"; "i")) then "DEPLOYMENT"
            elif (.message // "" | test("scal"; "i")) then "SCALING"
            elif (.message // "" | test("error|fail"; "i")) then "ERROR"
            else "TASK" end
          )
        }
      ]
    ' "$TMP/ecs_svc_detail.json" > "$TMP/ecs_evt_batch.json"

    jq -s '.[0] + .[1]' "$TMP/ecs_events.json" "$TMP/ecs_evt_batch.json" > "$TMP/ecs_evt_merged.json" && mv "$TMP/ecs_evt_merged.json" "$TMP/ecs_events.json"
  fi
done

ECS_SERVICES_TS=$(cat "$TMP/ecs_services.json")
ECS_EVENTS_TS=$(cat "$TMP/ecs_events.json")

# ────────────────────────────────────────────────────────────
# 13. ECS TASKS (for each cluster/service)
# ────────────────────────────────────────────────────────────
echo "  Fetching ECS tasks..."
echo '[]' > "$TMP/ecs_tasks.json"

for CLUSTER_ARN in $CLUSTER_ARNS; do
  CLUSTER_NAME=$(echo "$CLUSTER_ARN" | awk -F/ '{print $NF}')

  TASK_ARNS=$(aws ecs list-tasks --region "$REGION" --cluster "$CLUSTER_ARN" --output json 2>/dev/null | jq -r '.taskArns[]' 2>/dev/null || true)
  if [ -n "$TASK_ARNS" ]; then
    aws ecs describe-tasks --region "$REGION" --cluster "$CLUSTER_ARN" --tasks $TASK_ARNS --output json > "$TMP/ecs_task_detail.json" 2>/dev/null || echo '{"tasks":[]}' > "$TMP/ecs_task_detail.json"

    jq --arg cn "$CLUSTER_NAME" '
      [.tasks[] |
        {
          taskId: ((.taskArn // "" | split("/") | .[-1]) // "unknown"),
          taskDefinition: (.taskDefinitionArn // ""),
          serviceName: ((.group // "" | split(":") | .[-1]) // "unknown"),
          clusterName: $cn,
          status: (
            if .lastStatus == "RUNNING" then "RUNNING"
            elif .lastStatus == "PENDING" then "PENDING"
            elif .lastStatus == "PROVISIONING" then "PROVISIONING"
            elif .lastStatus == "STOPPING" then "STOPPING"
            else "STOPPED" end
          ),
          healthStatus: (if .healthStatus == "HEALTHY" then "HEALTHY" elif .healthStatus == "UNHEALTHY" then "UNHEALTHY" else "UNKNOWN" end),
          cpu: ((.cpu // "0") | tonumber),
          memory: ((.memory // "0") | tonumber),
          cpuUtilization: 0,
          memoryUtilization: 0,
          containers: [.containers[]? | {
            name: (.name // "unknown"),
            image: (.image // "unknown"),
            cpu: 0,
            memory: 0,
            status: (if .lastStatus == "RUNNING" then "RUNNING" elif .lastStatus == "STOPPED" then "STOPPED" else "PENDING" end),
            healthStatus: (if .healthStatus == "HEALTHY" then "HEALTHY" elif .healthStatus == "UNHEALTHY" then "UNHEALTHY" else "UNKNOWN" end),
            lastStartedAt: "1970-01-01T00:00:00Z"
          }],
          startedAt: (.startedAt // "1970-01-01T00:00:00Z"),
          stoppedAt: (.stoppedAt // null),
          stoppedReason: (.stoppedReason // null),
          launchType: (if .launchType == "EC2" then "EC2" else "FARGATE" end),
          privateIp: ((.attachments[]? | select(.type == "ElasticNetworkInterface") | .details[]? | select(.name == "privateIPv4Address") | .value) // "0.0.0.0")
        }
      ]
    ' "$TMP/ecs_task_detail.json" > "$TMP/ecs_task_batch.json"

    jq -s '.[0] + .[1]' "$TMP/ecs_tasks.json" "$TMP/ecs_task_batch.json" > "$TMP/ecs_task_merged.json" && mv "$TMP/ecs_task_merged.json" "$TMP/ecs_tasks.json"
  fi
done

ECS_TASKS_TS=$(cat "$TMP/ecs_tasks.json")

# ────────────────────────────────────────────────────────────
# 14. WAF (best effort - may not exist)
# ────────────────────────────────────────────────────────────
echo "  Fetching WAF data (if available)..."
WAF_ACLS=$(aws wafv2 list-web-acls --region "$REGION" --scope REGIONAL --output json 2>/dev/null || echo '{"WebACLs":[]}')
WAF_ACL_COUNT=$(echo "$WAF_ACLS" | jq '.WebACLs | length')

if [ "$WAF_ACL_COUNT" -gt 0 ]; then
  WAF_ACL_NAME=$(echo "$WAF_ACLS" | jq -r '.WebACLs[0].Name')
  WAF_ACL_ID=$(echo "$WAF_ACLS" | jq -r '.WebACLs[0].Id')

  aws wafv2 get-web-acl --region "$REGION" --scope REGIONAL --name "$WAF_ACL_NAME" --id "$WAF_ACL_ID" --output json > "$TMP/waf_acl.json" 2>/dev/null || echo '{}' > "$TMP/waf_acl.json"

  WAF_RULES_TS=$(jq '
    [(.WebACL.Rules // [])[] |
      {
        id: (.Name // "unknown"),
        name: (.Name // "unknown"),
        priority: (.Priority // 0),
        action: (if .Action.Block then "BLOCK" elif .Action.Count then "COUNT" else "ALLOW" end),
        type: (if .Statement.RateBasedStatement then "RATE_BASED" elif .Statement.ManagedRuleGroupStatement then "MANAGED" else "REGULAR" end),
        ruleGroup: ((.Statement.ManagedRuleGroupStatement.VendorName // "Custom") + "/" + (.Statement.ManagedRuleGroupStatement.Name // .Name // "unknown")),
        matchesLast24h: 0,
        blockRate: 0,
        enabled: true,
        description: (.Name // "WAF Rule")
      }
    ]
  ' "$TMP/waf_acl.json")

  WAF_WEB_ACL_TS=$(jq --arg region "$REGION" '
    {
      id: (.WebACL.Id // "unknown"),
      name: (.WebACL.Name // "unknown"),
      region: $region,
      rulesCount: (.WebACL.Rules | length),
      requestsSampled: 0,
      blockedRequests: 0,
      allowedRequests: 0
    }
  ' "$TMP/waf_acl.json")
else
  WAF_RULES_TS="[]"
  WAF_WEB_ACL_TS='{
    "id": "none",
    "name": "No WAF configured",
    "region": "'"$REGION"'",
    "rulesCount": 0,
    "requestsSampled": 0,
    "blockedRequests": 0,
    "allowedRequests": 0
  }'
fi

# WAF traffic/threats are sampled metrics — leave as zeroed
WAF_TRAFFIC_TS='[]'
WAF_TOP_THREATS_TS='[]'

# ────────────────────────────────────────────────────────────
# AI LOG ANALYSIS (static placeholder — not from AWS)
# ────────────────────────────────────────────────────────────
AI_LOG_ANALYSIS_TS='{
  "summary": "No log analysis data available — connect a log analysis service.",
  "severity": "low",
  "rootCause": "N/A",
  "recommendation": "Configure CloudWatch log insights or connect an AI analysis tool.",
  "relatedPatterns": []
}'

echo ""
echo "▸ Generating $OUT ..."

# ────────────────────────────────────────────────────────────
# WRITE OUTPUT FILE
# ────────────────────────────────────────────────────────────
cat > "$OUT" << 'HEADER'
import type {
  AiLogAnalysis,
  CloudWatchAlarm,
  CostData,
  DeployConfig,
  DeployPipeline,
  DeployRollback,
  DeploySchedule,
  EC2Instance,
  ECSCluster,
  ECSEvent,
  ECSService,
  ECSTask,
  EnvironmentState,
  IAMUser,
  JenkinsBuild,
  JenkinsJob,
  JenkinsQueueItem,
  JenkinsServerInfo,
  LambdaFunction,
  LogEntry,
  LogGroup,
  MetricDataPoint,
  S3Bucket,
  VPC,
  WafRule,
  WafTopThreat,
  WafTrafficData,
  WafWebAcl,
} from "@shared/types";

// ─────────────────────────────────────────────────────────
// Auto-generated from live AWS account on $(date -u +%Y-%m-%dT%H:%M:%SZ)
// Region: REGION_PLACEHOLDER
// Re-run: ./scripts/snapshot-aws-data.sh
// ─────────────────────────────────────────────────────────

HEADER

# Replace the region placeholder
sed -i "s/REGION_PLACEHOLDER/$REGION/" "$OUT"

# Helper to write a typed const
write_const() {
  local name="$1"
  local type="$2"
  local data="$3"
  # Pretty-print and convert to TypeScript
  echo "" >> "$OUT"
  echo "export const ${name}: ${type} = $(echo "$data" | jq '.' 2>/dev/null || echo "$data");" >> "$OUT"
}

write_const "ec2Instances" "EC2Instance[]" "$EC2_TS"
write_const "s3Buckets" "S3Bucket[]" "$S3_TS"
write_const "cloudWatchAlarms" "CloudWatchAlarm[]" "$CW_TS"
write_const "iamUsers" "IAMUser[]" "$IAM_TS"
write_const "lambdaFunctions" "LambdaFunction[]" "$LAMBDA_TS"
write_const "vpcs" "VPC[]" "$VPC_TS"
write_const "costHistory" "CostData[]" "$COST_TS"
write_const "cpuMetrics" "MetricDataPoint[]" "$CPU_TS"
write_const "networkMetrics" "MetricDataPoint[]" "$NET_TS"
write_const "logGroups" "LogGroup[]" "$LOGGROUPS_TS"
write_const "logEntries" "LogEntry[]" "$LOGENTRIES_TS"
write_const "aiLogAnalysis" "AiLogAnalysis" "$AI_LOG_ANALYSIS_TS"
write_const "wafRules" "WafRule[]" "$WAF_RULES_TS"
write_const "wafWebAcl" "WafWebAcl" "$WAF_WEB_ACL_TS"
write_const "wafTraffic" "WafTrafficData[]" "$WAF_TRAFFIC_TS"
write_const "wafTopThreats" "WafTopThreat[]" "$WAF_TOP_THREATS_TS"
write_const "ecsClusters" "ECSCluster[]" "$ECS_CLUSTERS_TS"
write_const "ecsServices" "ECSService[]" "$ECS_SERVICES_TS"
write_const "ecsTasks" "ECSTask[]" "$ECS_TASKS_TS"
write_const "ecsEvents" "ECSEvent[]" "$ECS_EVENTS_TS"

# ────────────────────────────────────────────────────────────
# Jenkins + Deployment data (not from AWS — keep hardcoded)
# ────────────────────────────────────────────────────────────
cat >> "$OUT" << 'JENKINS_DEPLOY_DATA'

// ─────────────────────────────────────────────────────────
// Jenkins & Deployment data (not sourced from AWS)
// These are placeholder/config data — update manually.
// ─────────────────────────────────────────────────────────

export const jenkinsServer: JenkinsServerInfo = {
  url: "https://jenkins.example.com",
  version: "2.462.1",
  connected: false,
  nodeCount: 0,
  executorsBusy: 0,
  executorsTotal: 0,
  queueLength: 0,
};

export const jenkinsJobs: JenkinsJob[] = [];

export const deployConfigs: DeployConfig[] = [];

export const jenkinsQueue: JenkinsQueueItem[] = [];

export const jenkinsBuildHistory: JenkinsBuild[] = [];

export const environmentStates: EnvironmentState[] = [];

export const deployPipelines: DeployPipeline[] = [];

export const deploySchedules: DeploySchedule[] = [];

export const deployRollbacks: DeployRollback[] = [];
JENKINS_DEPLOY_DATA

echo ""
echo "✔ Generated $OUT with live AWS data."
echo ""
echo "  Next steps:"
echo "    1. Review the generated file"
echo "    2. Run: pnpm lint:fix   (to format)"
echo "    3. Run: pnpm typecheck  (to verify types)"
echo "    4. Commit the updated mock data"
