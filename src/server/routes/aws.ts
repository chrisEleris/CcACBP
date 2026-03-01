import { Hono } from "hono";

export const awsRoutes = new Hono()
  .get("/ec2/instances", (c) => {
    return c.json({
      data: [],
      message: "Connect AWS credentials in Settings to fetch live EC2 data",
    });
  })
  .get("/s3/buckets", (c) => {
    return c.json({
      data: [],
      message: "Connect AWS credentials in Settings to fetch live S3 data",
    });
  })
  .get("/cloudwatch/alarms", (c) => {
    return c.json({
      data: [],
      message: "Connect AWS credentials in Settings to fetch live CloudWatch data",
    });
  })
  .get("/iam/users", (c) => {
    return c.json({
      data: [],
      message: "Connect AWS credentials in Settings to fetch live IAM data",
    });
  })
  .get("/lambda/functions", (c) => {
    return c.json({
      data: [],
      message: "Connect AWS credentials in Settings to fetch live Lambda data",
    });
  })
  .get("/vpc/list", (c) => {
    return c.json({
      data: [],
      message: "Connect AWS credentials in Settings to fetch live VPC data",
    });
  })
  .get("/costs/summary", (c) => {
    return c.json({
      data: [],
      message: "Connect AWS credentials in Settings to fetch live cost data",
    });
  });
