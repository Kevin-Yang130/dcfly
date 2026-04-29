resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnets"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name = "${local.name_prefix}-db-subnets"
  }
}

resource "aws_db_instance" "postgres" {
  identifier = "${local.name_prefix}-postgres"

  engine         = "postgres"
  instance_class = var.rds_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period = 7
  deletion_protection     = false
  skip_final_snapshot     = var.skip_final_snapshot

  tags = {
    Name = "${local.name_prefix}-postgres"
  }
}
