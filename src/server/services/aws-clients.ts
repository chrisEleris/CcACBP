import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";
import { EC2Client } from "@aws-sdk/client-ec2";
import { ECSClient } from "@aws-sdk/client-ecs";
import { IAMClient } from "@aws-sdk/client-iam";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { config } from "../config";

const region = config.AWS_REGION;

export const ec2Client = new EC2Client({ region });
export const ecsClient = new ECSClient({ region });
export const s3Client = new S3Client({ region });
export const cwClient = new CloudWatchClient({ region });
export const iamClient = new IAMClient({ region });
export const lambdaClient = new LambdaClient({ region });
export const costClient = new CostExplorerClient({ region });
