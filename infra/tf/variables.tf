variable "aws_region" {
  description = "AWS region for the application infrastructure."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short lowercase project name used in AWS resource names."
  type        = string
  default     = "dcfly"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "prod"
}

variable "owner" {
  description = "Owner tag for AWS resources."
  type        = string
  default     = "kevin-yang"
}

variable "vpc_cidr" {
  description = "CIDR block for the application VPC."
  type        = string
  default     = "10.30.0.0/16"
}

variable "availability_zones" {
  description = "Two availability zones for highly available subnets."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "db_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "dcfly"
}

variable "db_username" {
  description = "PostgreSQL username."
  type        = string
  default     = "dcfly"
}

variable "db_password" {
  description = "PostgreSQL password. Store the real value only in terraform.tfvars."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 8
    error_message = "db_password must be at least 8 characters."
  }
}

variable "jwt_secret" {
  description = "Secret key used by FastAPI to sign JWTs. Store the real value only in terraform.tfvars."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "jwt_secret should be at least 32 characters."
  }
}

variable "fmp_api_key" {
  description = "Financial Modeling Prep API key used by the backend."
  type        = string
  sensitive   = true
}

variable "frontend_origins_extra" {
  description = "Additional allowed frontend origins for direct browser access to the API."
  type        = list(string)
  default     = []
}

variable "backend_image_tag" {
  description = "Docker image tag to deploy from ECR."
  type        = string
  default     = "latest"
}

variable "backend_cpu" {
  description = "Fargate task CPU units."
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Fargate task memory in MiB."
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Number of backend tasks to run."
  type        = number
  default     = 1
}

variable "github_repository" {
  description = "Unused in backend-only deployment. Kept to avoid tfvars warnings from earlier Amplify setup."
  type        = string
  default     = ""
}

variable "github_branch" {
  description = "Unused in backend-only deployment. Kept to avoid tfvars warnings from earlier Amplify setup."
  type        = string
  default     = ""
}

variable "github_access_token" {
  description = "Unused in backend-only deployment. Kept to avoid tfvars warnings from earlier Amplify setup."
  type        = string
  sensitive   = true
  default     = ""
}

variable "rds_instance_class" {
  description = "RDS instance size."
  type        = string
  default     = "db.t3.micro"
}

variable "skip_final_snapshot" {
  description = "Whether to skip an RDS final snapshot when destroying the database."
  type        = bool
  default     = true
}
