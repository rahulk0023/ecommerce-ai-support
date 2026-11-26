# ecommerce-ai-support

A full-stack AI-powered customer support system for an e-commerce platform. Customers can raise support tickets, chat with an AI agent, request refunds, and track resolutions. Support staff can review escalations and approve or reject refund requests.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Python 3.11 + FastAPI |
| Database | PostgreSQL 15 |
| Auth | JWT (python-jose + bcrypt) |
| AI Agent | Rule-based mock LLM (drop-in replaceable with Gemini/OpenAI) |
| Policy Retrieval | Keyword-based search over `return_policy.txt` |
| Deployment | Docker + Docker Compose |

## Project Structure

```
ecommerce-ai-support/
├── backend/
│   ├── app/
│   │   ├── agent/         # AI agent + tool implementations
│   │   ├── middleware/    # Audit logging
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routers/       # FastAPI route handlers
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic
│   ├── data/              # return_policy.txt
│   ├── migrations/        # DB initialization
│   ├── seed/              # Sample data
│   └── tests/             # pytest test suite
├── frontend/
│   └── src/
│       ├── api/           # Axios client
│       ├── components/    # Reusable UI components
│       ├── contexts/      # Auth context
│       ├── pages/         # Route-level page components
│       └── types/         # TypeScript interfaces
├── docker-compose.yml
├── .env.example
└── README.md
```

## Prerequisites

- Docker and Docker Compose installed
- Or, for local development: Python 3.11+, Node.js 20+, PostgreSQL 15+

## Running with Docker (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/your-username/ecommerce-ai-support-system
cd ecommerce-ai-support

# 2. Set up environment
cp .env.example .env
# Edit .env and set a strong SECRET_KEY and POSTGRES_PASSWORD

# 3. Start everything
docker compose up --build

# 4. Access the app
# Frontend: http://localhost:3000
# Backend API docs: http://localhost:8000/docs
```

## Running Locally (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your local PostgreSQL

# Initialize database
python migrations/init_db.py

# Seed sample data
python seed/seed_data.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# App runs at http://localhost:5173
```

## Test Accounts

After running seed data:

| Role | Email | Password |
|------|-------|----------|
| Customer | rahul@example.com | test1234 |
| Customer | priya@example.com | test1234 |
| Staff | agent@support.com | staff1234 |
| Admin | admin@support.com | admin1234 |

## Running Tests

```bash
cd backend

# Make sure test database exists first
# (create ecommerce_support_test in PostgreSQL)

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_refunds.py -v
```

## API Documentation

FastAPI generates interactive docs automatically:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Key Features

### AI Agent
- Multi-turn conversation with context from previous messages
- 4 tools: `get_order_details`, `search_return_policy`, `process_refund`, `escalate_to_human`
- Asks for missing info (e.g., order ID) before calling tools
- Prompt injection detection and audit logging

### Business Rules
- **Return window**: 7 days from delivery date
- **Auto-approval limit**: Refunds ≤ ₹5,000 go to pending; above ₹5,000 are automatically escalated
- **Duplicate prevention**: Idempotency key support on refund requests
- **Ownership checks**: Customers can only access their own orders and tickets

### Security
- Passwords hashed with bcrypt
- JWT authentication on all protected routes
- Role-based access control (customer / staff / admin)
- Audit logging on all significant API calls
- Input sanitization (prompt injection detection)

## Architecture & Design Choices

- **Why FastAPI + PostgreSQL**: FastAPI provides automatic OpenAPI/Swagger documentation, Pydantic request validation, and clean dependency injection for JWT and role-based access control. PostgreSQL enforces relational integrity with foreign keys and indexes across users, orders, tickets, messages, refunds, and escalations.
- **Why Custom Rule-Based / Mock Agent + Keyword Retrieval**: Instead of requiring paid external LLM or vector-DB keys during local evaluation, the agent runs locally with deterministic multi-turn intent routing, prompt-injection detection, and paragraph-scoring keyword search over `backend/data/return_policy.txt`. All business rules (return window, ownership checks, idempotency, and the ₹5,000 escalation threshold) live strictly in backend services rather than inside the prompt or frontend.

```
Customer / Staff Browser
      │
      ▼
   React Frontend (port 3000)
      │  REST API calls (Bearer JWT)
      ▼
   FastAPI Backend (port 8000)
      │
      ├── Auth & Users (/auth, /users)
      ├── Orders, Tickets, Messages, Refunds, Escalations
      ├── Audit Logger Middleware (structured JSON logs)
      ├── AI Agent (Multi-turn + Prompt-Injection Guard)
      │     ├── get_order_details
      │     ├── search_return_policy  ◄── return_policy.txt
      │     ├── process_refund
      │     └── escalate_to_human
      │
      └── PostgreSQL Database (port 5432)
```

## Environment Variables

See `.env.example` for all required variables. Never commit actual credentials.

## AI Provider Note

The agent currently uses a rule-based mock LLM for local testing (no API key required). To connect a real LLM:

1. Install `google-generativeai` or `openai`
2. Replace the `mock_llm_response()` function in `backend/app/agent/agent_core.py` with actual API calls
3. Add your API key to `.env`

The mock implementation is intentionally designed so the swap is a single function replacement.
