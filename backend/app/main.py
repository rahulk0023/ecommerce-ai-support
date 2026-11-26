from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys

from app.routers import auth, users, orders, tickets, messages, refunds, escalations, agent
from app.middleware.audit_logger import audit_log_middleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

app = FastAPI(
    title="E-commerce AI Support API",
    description="Backend for the AI-powered customer support system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(audit_log_middleware)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(orders.router)
app.include_router(tickets.router)
app.include_router(messages.router)
app.include_router(refunds.router)
app.include_router(escalations.router)
app.include_router(agent.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "AI Support API is running. Visit /docs for the API reference."}
