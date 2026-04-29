# DCFly AWS Deployment

This deployment uses a backend-only version of the class architecture:

- ECR stores the backend Docker image.
- ECS Fargate runs the FastAPI backend in private subnets.
- An Application Load Balancer exposes the backend.
- RDS PostgreSQL stores users and saved stocks.
- ECS task environment variables provide `DATABASE_URL`, `FMP_API_KEY`, `SECRET_KEY`, and `FRONTEND_ORIGINS`.
- The Vite frontend runs locally and proxies `/api` to the deployed backend ALB.

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
docker build --platform linux/amd64 -t "${ECR_REPO}:latest" -f backend/Dockerfile backend
docker push "${ECR_REPO}:latest"
```

## 4. Apply Full Infrastructure

```bash
cd infra/tf
terraform apply
```

This creates the VPC, NAT Gateway, ALB, RDS, and ECS backend service.

## 5. Run Frontend Locally Against AWS Backend

Get the deployed backend URL:

```bash
terraform output -raw backend_api_url
```

Run local Vite with its `/api` proxy pointed at the ALB:

```bash
cd ../..
VITE_API_PROXY_TARGET="$(terraform -chdir=infra/tf output -raw backend_api_url)" npm run dev
```

## 6. Test

Backend health:

```bash
curl "$(terraform output -raw backend_api_url)/health"
```

Frontend:

```bash
open http://localhost:5173
```

Test sign up, login, search for a stock, save it, sign out, sign back in, and confirm it appears in saved stocks.

## Updating The Backend

After code changes:

```bash
cd ../..
docker build --platform linux/amd64 -t "${ECR_REPO}:latest" -f backend/Dockerfile backend
docker push "${ECR_REPO}:latest"

aws ecs update-service \
  --cluster "$(terraform -chdir=infra/tf output -raw ecs_cluster_name)" \
  --service "$(terraform -chdir=infra/tf output -raw ecs_service_name)" \
  --force-new-deployment
```

## Route 53 And HTTPS

The current setup is intentionally simple and class-project friendly. It exposes only the backend publicly and runs the frontend locally.

When you have a custom domain, the production upgrade is:

- Route 53 hosted zone for your domain.
- ACM certificate for `api.yourdomain.com`.
- HTTPS listener on the ALB.
- Route 53 alias record pointing `api.yourdomain.com` to the ALB.
- Deploy the frontend with Amplify, S3 + CloudFront, or a second ECS service when your AWS account allows it.

## Cost Notes

The NAT Gateway and RDS instance are the main always-on costs. Run `terraform destroy` when you no longer need the deployment.
