# API Documentation

Interactive OpenAPI / Swagger documentation is served by FastAPI when the backend is running, and the full schema is exported to [`docs/openapi.json`](openapi.json):

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

## Endpoints Overview

### Auth (`/auth`)
- `POST /auth/register` — Register a new customer account
- `POST /auth/login` — Authenticate and receive a JWT access token
- `GET /auth/me` — Get currently authenticated user profile

### Users (`/users`)
- `GET /users/me` — Get currently authenticated user profile
- `GET /users/` — List all users (**staff/admin only**)
- `GET /users/{user_id}` — Get user profile (owner or staff)

### Orders (`/orders`)
- `GET /orders/` — List orders (customers see own; staff can list all or filter by `customer_id`)
- `GET /orders/{order_id}` — Get order details (owner or staff)

### Tickets (`/tickets`)
- `POST /tickets/` — Create a new support ticket (validates referenced order ownership)
- `GET /tickets/` — List tickets with optional `status`, `priority`, `category`, and `q` search filters
- `GET /tickets/{ticket_id}` — Get ticket details
- `PATCH /tickets/{ticket_id}/status` — Update ticket status and/or priority (**staff only**)

### Messages (`/messages`)
- `POST /messages/` — Send a message (customer messages invoke the AI agent; staff replies post directly as `staff`)
- `GET /messages/ticket/{ticket_id}` — Get conversation history for a ticket

### AI Agent (`/agent`)
- `POST /agent/chat` — Multi-turn chat endpoint with tool execution and prompt-injection guard

### Refunds (`/refunds`)
- `POST /refunds/` — Request a refund (validates delivery, 7-day window, amount cap, and idempotency)
- `GET /refunds/` — List refunds with optional `ticket_id` or `order_id` filters
- `GET /refunds/{refund_id}` — Get refund status
- `POST /refunds/{refund_id}/review` — Approve or reject a pending/escalated refund (**staff only**)

### Escalations (`/escalations`)
- `POST /escalations/` — Create an escalation for human review
- `GET /escalations/` — List all escalations (**staff only**)
- `GET /escalations/{esc_id}` — Get escalation details (**staff only**)
- `POST /escalations/{esc_id}/review` — Approve, reject, or request more info (**staff only**)
