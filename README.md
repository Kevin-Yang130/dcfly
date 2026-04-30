# AutoDCF

AutoDCF is a stock valuation app for building a discounted cash flow model without having to collect every input by hand.

The project came from a simple problem: DCF models are useful, but they take time to set up. Financial data often has to be pulled from different places, cleaned up, and copied into a spreadsheet before the actual valuation work can begin. Existing tools can help, but many are expensive, locked behind subscriptions, or too rigid for people who want to adjust their own assumptions.

AutoDCF keeps the workflow direct. Search for a stock, review key metrics, change the DCF assumptions, and see the estimated intrinsic value, target buy price, upside or downside, and projected free cash flow chart.

## What It Does

- Searches public companies by ticker or name.
- Pulls stock price, EPS, free cash flow, shares outstanding, P/E ratio, and growth rates.
- Lets users adjust growth rate, discount rate, terminal growth, projection years, and margin of safety.
- Calculates intrinsic value per share and a target buy price.
- Supports user accounts with saved stocks and recently viewed stocks.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, JWT auth
- Database: SQLite locally, PostgreSQL for deployment
- Infrastructure: Docker, Terraform, AWS VPC, ECS Fargate, ECR, RDS, ALB, IAM, public/private subnets, NAT Gateway, and security groups

## Main Code Files

- `src/app/App.tsx`: Main frontend page and application state.
- `src/app/components/stock-search.tsx`: Stock search input, search results, and stock loading.
- `src/app/components/stock-metrics.tsx`: Stock summary cards and growth-rate timeframe controls.
- `src/app/components/dcf-calculator.tsx`: DCF inputs, valuation math, margin of safety, and chart.
- `src/app/components/auth-panel.tsx`: Sign in, account creation, and sign out UI.
- `src/app/components/saved-stocks-panel.tsx`: Saved stock list shown after login.
- `src/lib/api.ts`: Frontend API helper functions.
- `backend/main.py`: FastAPI app setup, CORS, database table creation, and router registration.
- `backend/services/stock_service.py`: Financial Modeling Prep calls, caching, stock search, and metric calculations.
- `backend/services/dcf_service.py`: Server-side DCF calculation logic.
- `backend/routers/stocks.py`: Stock search and stock detail API routes.
- `backend/routers/dcf.py`: DCF calculation API route.
- `backend/routers/auth.py`: Register, login, and current-user routes.
- `backend/routers/users.py`: Saved stocks and recently seen stocks routes.
- `backend/auth.py`: Password hashing, JWT creation, and auth helpers.
- `backend/database.py`, `backend/models.py`, `backend/schemas.py`: Database connection, tables, and request/response models.
- `infra/tf/`: Terraform files for AWS networking, ECS, ECR, RDS, ALB, IAM, and security groups.

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

SQLite works by default for local development. For a setup closer to the AWS deployment, use PostgreSQL:

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

## Deployment Notes

The cloud version is designed around a FastAPI backend running on ECS Fargate, a PostgreSQL database on RDS, and an Application Load Balancer in front of the backend. Terraform provisions the VPC, public subnets, private ECS subnets, database subnets, internet gateway, NAT Gateway, ALB, ECS cluster, ECS service, ECR repository, RDS instance, IAM policies, and security groups.

For the class deployment, AWS account permissions limited some services, including Amplify and Secrets Manager. The architecture was adjusted to keep the backend on ECS/RDS/ALB, run the frontend locally, and pass backend environment variables through the ECS task definition.

See `infra/README.md` for the AWS deployment steps.
