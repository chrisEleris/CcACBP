# ──────────────────────────────────────────────────────────
# Prod Environment
#
# Usage:
#   cd terraform/environments/prod
#   terraform init
#   terraform plan
#   terraform apply
# ──────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "ccacbp-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "ccacbp-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "prod"
      Project     = var.project_name
      ManagedBy   = "terraform"
    }
  }
}

# ── Variables ──────────────────────────────────────────────

variable "project_name" {
  type    = string
  default = "ccacbp"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "container_image" {
  description = "Docker image URI — set via CLI or CI/CD"
  type        = string
  # REQUIRED in prod — no default. Forces explicit image specification.
}

# ── Modules ────────────────────────────────────────────────

module "vpc" {
  source = "../../modules/vpc"

  project_name       = var.project_name
  environment        = "prod"
  vpc_cidr           = "10.20.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
  enable_nat_gateway = true # Required for private subnet internet access
}

module "ecr" {
  source = "../../modules/ecr"

  project_name = var.project_name
  environment  = "prod"
}

module "alb" {
  source = "../../modules/alb"

  project_name      = var.project_name
  environment       = "prod"
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  container_port    = 3000
  health_check_path = "/api/health"
}

module "ecs" {
  source = "../../modules/ecs"

  project_name          = var.project_name
  environment           = "prod"
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids # True private subnets with NAT
  alb_security_group_id = module.alb.security_group_id
  target_group_arn      = module.alb.target_group_arn
  container_image       = var.container_image
  container_port        = 3000
  health_check_path     = "/api/health"

  # Prod sizing — higher resources
  cpu           = 512
  memory        = 1024
  desired_count = 2

  # Environment variables for prod
  environment_variables = {
    NODE_ENV       = "production"
    PORT           = "3000"
    LOG_LEVEL      = "warn"
    VITE_BASE_PATH = "/"
    APP_ENV        = "prod"
  }

  log_retention_days = 30

  # Enable auto-scaling in prod
  enable_autoscaling = true
  min_capacity       = 2
  max_capacity       = 6
  cpu_scaling_target = 70
}

# ── Outputs ────────────────────────────────────────────────

output "alb_url" {
  description = "Application URL (prod)"
  value       = "http://${module.alb.alb_dns_name}"
}

output "ecr_repository_url" {
  description = "ECR repository URL for docker push"
  value       = module.ecr.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "log_group" {
  description = "CloudWatch log group"
  value       = module.ecs.log_group_name
}
