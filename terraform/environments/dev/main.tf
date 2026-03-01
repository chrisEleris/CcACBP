# ──────────────────────────────────────────────────────────
# Dev Environment
#
# Usage:
#   cd terraform/environments/dev
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
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "ccacbp-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "dev"
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
  default     = "" # Set at apply time: -var="container_image=ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/ccacbp-app:latest"
}

# ── Modules ────────────────────────────────────────────────

module "vpc" {
  source = "../../modules/vpc"

  project_name       = var.project_name
  environment        = "dev"
  vpc_cidr           = "10.10.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
  enable_nat_gateway = false # Save ~$32/mo in dev — tasks use public subnets
}

module "ecr" {
  source = "../../modules/ecr"

  project_name = var.project_name
  environment  = "dev"
}

module "alb" {
  source = "../../modules/alb"

  project_name      = var.project_name
  environment       = "dev"
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  container_port    = 3000
  health_check_path = "/api/health"
}

module "ecs" {
  source = "../../modules/ecs"

  project_name          = var.project_name
  environment           = "dev"
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.public_subnet_ids # Use public subnets in dev (no NAT)
  alb_security_group_id = module.alb.security_group_id
  target_group_arn      = module.alb.target_group_arn
  container_image       = var.container_image != "" ? var.container_image : "${module.ecr.repository_url}:latest"
  container_port        = 3000
  health_check_path     = "/api/health"

  # Dev sizing — minimal resources
  cpu           = 256
  memory        = 512
  desired_count = 1

  # Environment variables for dev
  environment_variables = {
    NODE_ENV       = "development"
    PORT           = "3000"
    LOG_LEVEL      = "debug"
    VITE_BASE_PATH = "/"
    APP_ENV        = "dev"
  }

  log_retention_days = 7

  # No auto-scaling in dev
  enable_autoscaling = false
}

# ── Outputs ────────────────────────────────────────────────

output "alb_url" {
  description = "Application URL (dev)"
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
