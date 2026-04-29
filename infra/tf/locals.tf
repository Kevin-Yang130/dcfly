locals {
  name_prefix = "${var.project_name}-${var.environment}"

  public_subnet_cidrs  = ["10.30.0.0/24", "10.30.1.0/24"]
  private_subnet_cidrs = ["10.30.10.0/24", "10.30.11.0/24"]
  db_subnet_cidrs      = ["10.30.20.0/24", "10.30.21.0/24"]

  frontend_origins = concat(
    [
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    var.frontend_origins_extra,
  )

  tags = {
    Project     = var.project_name
    Environment = var.environment
    Owner       = var.owner
    ManagedBy   = "terraform"
  }
}
