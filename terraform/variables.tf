variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix for tags and resource names"
  type        = string
  default     = "campus-placement-portal"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "production"
}

variable "db_username" {
  description = "Database administrator username"
  type        = string
  default     = "placement_admin"
}

variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
  default     = "PlacementSecretPassword2026!"
}

variable "container_image" {
  description = "ECR or Docker container image URI"
  type        = string
  default     = "public.ecr.aws/placement-portal/api:latest"
}
