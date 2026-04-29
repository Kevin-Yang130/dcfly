# DCFly AWS Deployment

This deployment uses a simpler version of the class architecture:

- Amplify hosts the Vite frontend from GitHub.
- Amplify proxies `/api/*` to the backend ALB, so the frontend can keep using relative `/api` calls.
- ECR stores the backend Docker image.
- ECS Fargate runs the FastAPI backend in private subnets.
- An Application Load Balancer exposes the backend.
- RDS PostgreSQL stores users and saved stocks.
- Secrets Manager stores `DATABASE_URL`, `FMP_API_KEY`, `SECRET_KEY`, and `FRONTEND_ORIGINS`.
- CloudWatch stores backend logs.

Redis, Kubernetes, EKS, and Helm are intentionally omitted because this app does not need them.

## 1. Configure Terraform

```bash
cd infra/tf
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

- `db_password`: strong database password.
- `jwt_secret`: at least 32 random characters.
- `fmp_api_key`: your Financial Modeling Prep API key.
- `github_repository`: your project repo URL.
- `github_access_token`: a GitHub token Amplify can use to connect to the repo.

Then initialize:

```bash
terraform init
terraform validate
```

## 2. Create ECR First

The ECS service needs an image that already exists, so create ECR first:

```bash
terraform apply \
  -target=aws_ecr_repository.backend \
  -target=aws_ecr_lifecycle_policy.backend
```

## 3. Build And Push Backend Image

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REPO=$(aws ecr describe-repositories \
  --repository-names dcfly-prod-backend \
  --query 'repositories[0].repositoryUri' \
  --output text)

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

cd ../..
docker build --platform linux/amd64 -t "$ECR_REPO:latest" -f backend/Dockerfile backend
docker push "$ECR_REPO:latest"
```

## 4. Apply Full Infrastructure

```bash
cd infra/tf
terraform apply
```

This creates the VPC, NAT Gateway, ALB, RDS, Secrets Manager secret, ECS service, and Amplify app.

## 5. Deploy Frontend

Amplify is connected to your GitHub repo. It may start automatically after the branch is created. If it does not:

```bash
aws amplify start-job \
  --app-id "$(terraform output -raw amplify_app_id)" \
  --branch-name "main" \
  --job-type RELEASE
```

Open:

```bash
terraform output frontend_url
```

## 6. Test

Backend health:

```bash
curl "$(terraform output -raw backend_api_url)/health"
```

Frontend:

```bash
open "$(terraform output -raw frontend_url)"
```

Test sign up, login, search for a stock, save it, sign out, sign back in, and confirm it appears in saved stocks.

## Updating The Backend

After code changes:

```bash
cd ../..
docker build --platform linux/amd64 -t "$ECR_REPO:latest" -f backend/Dockerfile backend
docker push "$ECR_REPO:latest"

aws ecs update-service \
  --cluster "$(terraform -chdir=infra/tf output -raw ecs_cluster_name)" \
  --service "$(terraform -chdir=infra/tf output -raw ecs_service_name)" \
  --force-new-deployment
```

## Route 53 And HTTPS

The current setup is intentionally simple and class-project friendly. It uses Amplify's HTTPS domain for the frontend and an HTTP ALB behind an Amplify proxy for `/api/*`.

When you have a custom domain, the production upgrade is:

- Route 53 hosted zone for your domain.
- ACM certificate for `api.yourdomain.com`.
- HTTPS listener on the ALB.
- Route 53 alias record pointing `api.yourdomain.com` to the ALB.
- Amplify custom domain for the frontend.
- Replace the Amplify `/api/*` proxy target with `https://api.yourdomain.com/api/<*>`.

## Cost Notes

The NAT Gateway and RDS instance are the main always-on costs. Run `terraform destroy` when you no longer need the deployment.
