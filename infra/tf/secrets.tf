resource "aws_secretsmanager_secret" "backend" {
  name        = "${local.name_prefix}/backend"
  description = "Runtime configuration for the DCFly FastAPI backend"
}

resource "aws_secretsmanager_secret_version" "backend" {
  secret_id = aws_secretsmanager_secret.backend.id

  secret_string = jsonencode({
    DATABASE_URL     = "postgresql+psycopg2://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${var.db_name}"
    FMP_API_KEY      = var.fmp_api_key
    SECRET_KEY       = var.jwt_secret
    FRONTEND_ORIGINS = join(",", local.frontend_origins)
  })
}
