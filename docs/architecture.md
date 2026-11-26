# System Architecture

This document outlines the architecture of the **AI-Powered E-commerce Customer Support System**, covering the frontend, backend API, AI agent tools, database, and human-review escalation workflow.

```mermaid
flowchart TB
    subgraph Client["Frontend (React + TypeScript + Vite)"]
        UI["Customer & Staff UI\n(Orders, Tickets, Chat, Refund Tracking, Staff Panel)"]
    end

    subgraph API["Backend (FastAPI + Python)"]
        Auth["Auth & RBAC\n(JWT + bcrypt)"]
        Routes["REST Routers\n(/auth, /orders, /tickets, /messages, /refunds, /escalations, /agent)"]
        Audit["Audit Logger Middleware"]
        Services["Business Services\n(refund_service, escalation_service, policy_service)"]
        Agent["AI Support Agent\n(Multi-turn + Prompt Injection Guard)"]
    end

    subgraph Tools["Agent Tools"]
        T1["get_order_details(order_id)"]
        T2["search_return_policy(category)"]
        T3["process_refund(order_id, amount, reason)"]
        T4["escalate_to_human(ticket_id, summary, priority)"]
    end

    subgraph Data["Data & Policy Layer"]
        DB[("PostgreSQL Database\nUsers, Orders, Tickets, Messages, Refunds, Escalations")]
        Policy["return_policy.txt\n(Local Policy Document)"]
    end

    UI <-->|"REST JSON + Bearer JWT"| Audit
    Audit --> Routes
    Routes --> Auth
    Routes --> Services
    Routes --> Agent

    Agent --> T1
    Agent --> T2
    Agent --> T3
    Agent --> T4

    T1 --> DB
    T2 --> Policy
    T3 -->|"Return window, ownership, <= ₹5,000 check"| Services
    T4 -->|"Refund > ₹5,000 or user request"| Services
    Services --> DB
```

## Request & Escalation Flow

1. **Customer Authentication**: Customer registers or logs in via `/auth/login` and receives a JWT token.
2. **Ticket & Chat**: Customer creates a support ticket and sends messages to `/agent/chat` or `/messages/`.
3. **AI Agent Guardrails**:
   - Checks for prompt injection attempts before routing.
   - Asks for missing order IDs before calling order/refund tools.
   - Enforces order ownership (`order.customer_id == current_user.id`).
4. **Refund Validation & Escalation**:
   - Backend validates delivered status, 7-day return window, order total cap, and idempotency key.
   - Refunds **≤ ₹5,000** are created in `pending` state.
   - Refunds **> ₹5,000** automatically create an `Escalation` record and set ticket status to `pending_review`.
5. **Human Staff Review**: Staff members log into the Staff Panel (`/staff`) to approve, reject, or request more info on escalated cases.
