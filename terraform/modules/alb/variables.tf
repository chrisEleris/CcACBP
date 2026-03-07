variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  type        = list(string)
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 3000
}

variable "health_check_path" {
  description = "Health check path for the target group"
  type        = string
  default     = "/api/health"
}

# variable "certificate_arn" {
#   description = "ACM certificate ARN for HTTPS"
#   type        = string
#   default     = ""
# }

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the ALB (set to your IP for security)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
