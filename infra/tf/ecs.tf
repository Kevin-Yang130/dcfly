resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}-backend"
  retention_in_days = 14
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"
      essential = true

      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.backend.arn}:DATABASE_URL::"
        },
        {
          name      = "FMP_API_KEY"
          valueFrom = "${aws_secretsmanager_secret.backend.arn}:FMP_API_KEY::"
        },
        {
          name      = "SECRET_KEY"
          valueFrom = "${aws_secretsmanager_secret.backend.arn}:SECRET_KEY::"
        },
        {
          name      = "FRONTEND_ORIGINS"
          valueFrom = "${aws_secretsmanager_secret.backend.arn}:FRONTEND_ORIGINS::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "backend"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "backend" {
  name            = "${local.name_prefix}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_task_execution,
    aws_iam_role_policy_attachment.ecs_secrets,
  ]
}
