
# Design DCF Model Interface

This is a DCF stock valuation app with a FastAPI backend and React/Vite frontend.

## Local Setup

Install frontend dependencies:

```bash
npm i
```

Install backend dependencies:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` from `backend/.env.example` and fill in `FMP_API_KEY` and `SECRET_KEY`.

## Database

For local assignment work, SQLite still works by default. For a setup that matches the eventual AWS deployment more closely, use PostgreSQL:

```bash
docker compose up -d postgres
```

Set this in `backend/.env`:

```bash
DATABASE_URL=postgresql+psycopg2://dcfly:dcfly_dev_password@localhost:5432/dcfly
```

The backend creates the `users`, `recently_seen`, and `saved_stocks` tables on startup.

## Running The App

Start the backend:

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

Start the frontend:

```bash
npm run dev
```

The frontend dev server proxies `/api` requests to `http://localhost:8000`.

## AWS Deployment Direction

Use Amazon RDS for PostgreSQL for the database, not SQLite. In Terraform, provision an RDS PostgreSQL instance, store `DATABASE_URL` and `SECRET_KEY` in AWS Secrets Manager or SSM Parameter Store, and run the FastAPI backend on ECS Fargate, Elastic Beanstalk, or App Runner. The Vite frontend can be deployed separately to S3 + CloudFront.
