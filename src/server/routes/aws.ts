import { DescribeAlarmsCommand } from "@aws-sdk/client-cloudwatch";
import { GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { DescribeSubnetsCommand, DescribeVpcsCommand } from "@aws-sdk/client-ec2";
import { ListUsersCommand } from "@aws-sdk/client-iam";
import { ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { Hono } from "hono";
import type {
  CloudWatchAlarm,
  CostData,
  EC2Instance,
  IAMUser,
  LambdaFunction,
  S3Bucket,
  VPC,
} from "../../shared/types";
import {
  costClient,
  cwClient,
  ec2Client,
  iamClient,
  lambdaClient,
  s3Client,
  ec2Client as vpcClient,
} from "../services/aws-clients";

const region = process.env.AWS_REGION || "us-east-1";

function formatCodeSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function getMonthAbbr(date: Date): string {
  return date.toLocaleString("en-US", { month: "short" });
}

export const awsRoutes = new Hono()
  .get("/ec2/instances", async (c) => {
    try {
      const response = await ec2Client.send(new DescribeInstancesCommand({}));

      const instances: EC2Instance[] = [];
      for (const reservation of response.Reservations ?? []) {
        for (const instance of reservation.Instances ?? []) {
          const nameTag = instance.Tags?.find((t) => t.Key === "Name");
          const id = instance.InstanceId ?? "unknown";
          const rawState = instance.State?.Name;
          let state: EC2Instance["state"] = "terminated";
          if (
            rawState === "running" ||
            rawState === "stopped" ||
            rawState === "pending" ||
            rawState === "terminated"
          ) {
            state = rawState;
          }

          instances.push({
            id,
            name: nameTag?.Value ?? id,
            type: instance.InstanceType ?? "unknown",
            state,
            az: instance.Placement?.AvailabilityZone ?? "-",
            publicIp: instance.PublicIpAddress ?? "-",
            privateIp: instance.PrivateIpAddress ?? "-",
            cpu: 0,
            memory: 0,
            launchTime: instance.LaunchTime?.toISOString() ?? new Date().toISOString(),
          });
        }
      }

      return c.json({ data: instances, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error fetching EC2 instances";
      console.error("EC2 DescribeInstances error:", err);
      return c.json({ data: [], error: message });
    }
  })
  .get("/s3/buckets", async (c) => {
    try {
      const response = await s3Client.send(new ListBucketsCommand({}));

      const buckets: S3Bucket[] = (response.Buckets ?? []).map((bucket) => ({
        name: bucket.Name ?? "unknown",
        region,
        sizeGb: 0,
        objects: 0,
        access: "private" as const,
        versioning: false,
        createdAt: bucket.CreationDate?.toISOString() ?? new Date().toISOString(),
      }));

      return c.json({ data: buckets, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error fetching S3 buckets";
      console.error("S3 ListBuckets error:", err);
      return c.json({ data: [], error: message });
    }
  })
  .get("/cloudwatch/alarms", async (c) => {
    try {
      const response = await cwClient.send(new DescribeAlarmsCommand({}));

      const alarms: CloudWatchAlarm[] = (response.MetricAlarms ?? []).map((alarm) => {
        const rawState = alarm.StateValue;
        let state: CloudWatchAlarm["state"] = "INSUFFICIENT_DATA";
        if (rawState === "OK" || rawState === "ALARM" || rawState === "INSUFFICIENT_DATA") {
          state = rawState;
        }

        return {
          name: alarm.AlarmName ?? "unknown",
          metric: alarm.MetricName ?? "unknown",
          namespace: alarm.Namespace ?? "unknown",
          state,
          threshold: String(alarm.Threshold ?? 0),
          period: String(alarm.Period ?? 0),
        };
      });

      return c.json({ data: alarms, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error fetching CloudWatch alarms";
      console.error("CloudWatch DescribeAlarms error:", err);
      return c.json({ data: [], error: message });
    }
  })
  .get("/iam/users", async (c) => {
    try {
      const response = await iamClient.send(new ListUsersCommand({}));

      const users: IAMUser[] = (response.Users ?? []).map((user) => ({
        name: user.UserName ?? "unknown",
        arn: user.Arn ?? "",
        groups: [],
        mfaEnabled: false,
        lastActive: user.PasswordLastUsed?.toISOString() ?? "Never",
        accessKeys: 0,
      }));

      return c.json({ data: users, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error fetching IAM users";
      console.error("IAM ListUsers error:", err);
      return c.json({ data: [], error: message });
    }
  })
  .get("/lambda/functions", async (c) => {
    try {
      const response = await lambdaClient.send(new ListFunctionsCommand({}));

      const functions: LambdaFunction[] = (response.Functions ?? []).map((fn) => ({
        name: fn.FunctionName ?? "unknown",
        runtime: fn.Runtime ?? "unknown",
        memory: fn.MemorySize ?? 0,
        timeout: fn.Timeout ?? 0,
        lastInvoked: fn.LastModified ?? new Date().toISOString(),
        invocations24h: 0,
        errors24h: 0,
      }));

      return c.json({ data: functions, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error fetching Lambda functions";
      console.error("Lambda ListFunctions error:", err);
      return c.json({ data: [], error: message });
    }
  })
  .get("/vpc/list", async (c) => {
    try {
      const [vpcsResponse, subnetsResponse] = await Promise.all([
        vpcClient.send(new DescribeVpcsCommand({})),
        vpcClient.send(new DescribeSubnetsCommand({})),
      ]);

      const subnetsByVpc = new Map<string, number>();
      for (const subnet of subnetsResponse.Subnets ?? []) {
        const vpcId = subnet.VpcId ?? "";
        subnetsByVpc.set(vpcId, (subnetsByVpc.get(vpcId) ?? 0) + 1);
      }

      const vpcs: VPC[] = (vpcsResponse.Vpcs ?? []).map((vpc) => {
        const nameTag = vpc.Tags?.find((t) => t.Key === "Name");
        const id = vpc.VpcId ?? "unknown";
        return {
          id,
          name: nameTag?.Value ?? id,
          cidr: vpc.CidrBlock ?? "0.0.0.0/0",
          subnets: subnetsByVpc.get(id) ?? 0,
          region,
          isDefault: vpc.IsDefault ?? false,
        };
      });

      return c.json({ data: vpcs, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error fetching VPCs";
      console.error("EC2 DescribeVpcs error:", err);
      return c.json({ data: [], error: message });
    }
  })
  .get("/costs/summary", async (c) => {
    try {
      const now = new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 6);

      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      const response = await costClient.send(
        new GetCostAndUsageCommand({
          TimePeriod: {
            Start: formatDate(startDate),
            End: formatDate(endDate),
          },
          Granularity: "MONTHLY",
          GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
          Metrics: ["BlendedCost"],
        }),
      );

      const serviceToCategory = (service: string): keyof Omit<CostData, "month"> => {
        if (service.includes("Amazon Elastic Compute Cloud")) return "ec2";
        if (service.includes("Amazon Simple Storage Service")) return "s3";
        if (service.includes("Amazon Relational Database Service")) return "rds";
        if (service.includes("AWS Lambda")) return "lambda";
        return "other";
      };

      const costData: CostData[] = (response.ResultsByTime ?? []).map((result) => {
        const monthDate = new Date(result.TimePeriod?.Start ?? now.toISOString());
        const row: CostData = {
          month: getMonthAbbr(monthDate),
          ec2: 0,
          s3: 0,
          rds: 0,
          lambda: 0,
          other: 0,
        };

        for (const group of result.Groups ?? []) {
          const service = group.Keys?.[0] ?? "";
          const amount = Number.parseFloat(group.Metrics?.BlendedCost?.Amount ?? "0");
          const category = serviceToCategory(service);
          row[category] += amount;
        }

        // Round all values to 2 decimal places
        row.ec2 = Math.round(row.ec2 * 100) / 100;
        row.s3 = Math.round(row.s3 * 100) / 100;
        row.rds = Math.round(row.rds * 100) / 100;
        row.lambda = Math.round(row.lambda * 100) / 100;
        row.other = Math.round(row.other * 100) / 100;

        return row;
      });

      return c.json({ data: costData, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error fetching cost data";
      console.error("Cost Explorer GetCostAndUsage error:", err);
      return c.json({ data: [], error: message });
    }
  });

// formatCodeSize is available for future use if needed
void formatCodeSize;
