import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
import models
from routers import stocks, dcf
from routers import auth as auth_router
from routers import users as users_router

# Create all database tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="DCFly API", version="1.0.0")

allowed_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router, prefix="/api")
app.include_router(dcf.router, prefix="/api")
app.include_router(auth_router.router, prefix="/api")
app.include_router(users_router.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
