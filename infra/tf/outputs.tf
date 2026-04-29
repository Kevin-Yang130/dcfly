output "ecr_repository_url" {
  description = "ECR repository URL for backend images."
  value       = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS backend service name."
  value       = aws_ecs_service.backend.name
}

output "backend_alb_dns_name" {
  description = "Public ALB DNS name for the backend."
  value       = aws_lb.backend.dns_name
}

output "backend_api_url" {
  description = "Public HTTP URL for the backend API."
  value       = "http://${aws_lb.backend.dns_name}"
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint."
  value       = aws_db_instance.postgres.endpoint
}

output "rds_hostname" {
  description = "RDS PostgreSQL hostname."
  value       = aws_db_instance.postgres.address
}

output "rds_port" {
  description = "RDS PostgreSQL port."
  value       = aws_db_instance.postgres.port
}

output "local_frontend_command" {
  description = "Command for running the local Vite frontend against the deployed backend."
  value       = "VITE_API_PROXY_TARGET=http://${aws_lb.backend.dns_name} npm run dev"
}
