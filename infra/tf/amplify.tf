resource "aws_amplify_app" "frontend" {
  name         = "${local.name_prefix}-frontend"
  repository   = var.github_repository
  access_token = var.github_access_token

  platform = "WEB"

  build_spec = <<-YAML
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  YAML

  custom_rule {
    source = "/api/<*>"
    target = "http://${aws_lb.backend.dns_name}/api/<*>"
    status = "200"
  }

  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>"
    target = "/index.html"
    status = "200"
  }

  environment_variables = {
    AMPLIFY_DIFF_DEPLOY = "false"
  }
}

resource "aws_amplify_branch" "frontend" {
  app_id            = aws_amplify_app.frontend.id
  branch_name       = var.github_branch
  enable_auto_build = true
  stage             = "PRODUCTION"
}
