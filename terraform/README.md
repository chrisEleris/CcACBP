# Terraform Infrastructure — CcACBP

Deploys the CcACBP admin panel to AWS ECS Fargate behind an ALB.

## Architecture

```
Internet → ALB (public subnets) → ECS Fargate (private subnets) → ECR Image
                                                                ↓
                                                          CloudWatch Logs
```

| Component | Dev | Prod |
|-----------|-----|------|
| VPC CIDR | 10.10.0.0/16 | 10.20.0.0/16 |
| AZs | us-east-1a, 1b | us-east-1a, 1b |
| NAT Gateway | Disabled (saves ~$32/mo) | Enabled |
| Fargate CPU | 256 (0.25 vCPU) | 512 (0.5 vCPU) |
| Fargate Memory | 512 MB | 1024 MB |
| Task Count | 1 | 2 (auto-scales 2–6) |
| Log Retention | 7 days | 30 days |
| Deletion Protection | Off | On |

## Quick Start

### 1. Bootstrap State Backend (one-time)

```bash
cd terraform/bootstrap
terraform init
terraform apply
```

This creates:
- S3 bucket `ccacbp-terraform-state` (versioned, encrypted)
- DynamoDB table `ccacbp-terraform-locks`

### 2. Deploy Dev Environment

```bash
# Build and push Docker image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker build -t ccacbp-app .
docker tag ccacbp-app:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ccacbp-app:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ccacbp-app:latest

# Deploy infrastructure
cd terraform/environments/dev
terraform init
terraform apply
```

### 3. Deploy Prod Environment

```bash
cd terraform/environments/prod
terraform init
terraform apply -var="container_image=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ccacbp-app:v1.0.0"
```

## Environment Variables Strategy

### How Env Vars Are Set

Environment variables are defined in each environment's `main.tf` inside the ECS module's `environment_variables` map. They're injected into the container at runtime via the ECS task definition.

**Dev** (`terraform/environments/dev/main.tf`):
```hcl
environment_variables = {
  NODE_ENV       = "development"
  PORT           = "3000"
  LOG_LEVEL      = "debug"
  VITE_BASE_PATH = "/"
  APP_ENV        = "dev"
}
```

**Prod** (`terraform/environments/prod/main.tf`):
```hcl
environment_variables = {
  NODE_ENV       = "production"
  PORT           = "3000"
  LOG_LEVEL      = "warn"
  VITE_BASE_PATH = "/"
  APP_ENV        = "prod"
}
```

### Adding New Environment Variables

1. Add the variable to the `environment_variables` map in the environment's `main.tf`
2. Run `terraform plan` to verify
3. Run `terraform apply` — ECS will perform a rolling update

### Secrets (API Keys, DB Passwords)

For sensitive values, use AWS Systems Manager Parameter Store or Secrets Manager instead of plain env vars:

```hcl
# In the ECS task definition, reference secrets:
secrets = [
  {
    name      = "DATABASE_URL"
    valueFrom = "arn:aws:ssm:us-east-1:ACCOUNT:parameter/ccacbp/prod/database-url"
  },
  {
    name      = "API_KEY"
    valueFrom = "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:ccacbp/prod/api-key"
  }
]
```

To add SSM parameters:
```bash
# Dev
aws ssm put-parameter --name "/ccacbp/dev/database-url" --type SecureString --value "postgres://..."

# Prod
aws ssm put-parameter --name "/ccacbp/prod/database-url" --type SecureString --value "postgres://..."
```

## Directory Structure

```
terraform/
├── bootstrap/          # State backend (run first)
│   └── main.tf
├── modules/
│   ├── vpc/            # VPC, subnets, IGW, NAT, route tables
│   ├── ecr/            # Container registry
│   ├── alb/            # Application Load Balancer
│   └── ecs/            # Cluster, task def, service, auto-scaling
├── environments/
│   ├── dev/            # Dev environment config
│   │   └── main.tf
│   └── prod/           # Prod environment config
│       └── main.tf
└── README.md
```

## Updating the App

```bash
# 1. Build new image
docker build -t ccacbp-app:v1.1.0 .

# 2. Push to ECR
docker tag ccacbp-app:v1.1.0 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ccacbp-app:v1.1.0
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ccacbp-app:v1.1.0

# 3. Deploy to dev
cd terraform/environments/dev
terraform apply -var="container_image=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ccacbp-app:v1.1.0"

# 4. After testing, deploy to prod
cd ../prod
terraform apply -var="container_image=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ccacbp-app:v1.1.0"
```

## Force Redeployment (Same Image)

```bash
aws ecs update-service \
  --cluster ccacbp-dev \
  --service ccacbp-dev \
  --force-new-deployment
```

## Estimated Monthly Cost (Dev)

| Resource | Estimated Cost |
|----------|---------------|
| Fargate (256 CPU, 512 MB, 1 task) | ~$9/mo |
| ALB | ~$16/mo |
| NAT Gateway | $0 (disabled) |
| ECR | ~$1/mo |
| CloudWatch Logs | ~$1/mo |
| **Total** | **~$27/mo** |

## Estimated Monthly Cost (Prod)

| Resource | Estimated Cost |
|----------|---------------|
| Fargate (512 CPU, 1024 MB, 2 tasks) | ~$36/mo |
| ALB | ~$16/mo |
| NAT Gateway | ~$32/mo |
| ECR | ~$1/mo |
| CloudWatch Logs | ~$3/mo |
| **Total** | **~$88/mo** |
