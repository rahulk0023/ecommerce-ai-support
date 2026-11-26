def test_customer_can_create_order(client, customer_token):
    resp = client.post(
        "/orders/",
        json={
            "item_category": "electronics",
            "item_details": "Mechanical Keyboard",
            "total_amount": 6500.0,
            "status": "delivered",
        },
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["item_category"] == "electronics"
    assert data["total_amount"] == 6500.0
    assert data["status"] == "delivered"
    assert data["delivery_date"] is not None


def test_create_order_requires_positive_amount(client, customer_token):
    resp = client.post(
        "/orders/",
        json={
            "item_category": "books",
            "item_details": "Notebook",
            "total_amount": -100,
            "status": "delivered",
        },
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 422


def test_create_order_unauthenticated_blocked(client):
    resp = client.post(
        "/orders/",
        json={"item_category": "books", "total_amount": 500, "status": "delivered"},
    )
    assert resp.status_code == 401


def test_high_value_refund_with_ticket_escalates_and_sets_ticket_pending_review(
    client, customer_token, staff_token
):
    order_resp = client.post(
        "/orders/",
        json={
            "item_category": "electronics",
            "item_details": "4K Monitor",
            "total_amount": 12000.0,
            "status": "delivered",
        },
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert order_resp.status_code == 201
    order_id = order_resp.json()["id"]

    ticket_resp = client.post(
        "/tickets/",
        json={
            "subject": "Monitor refund",
            "description": "Screen flickering",
            "category": "refund",
            "order_id": order_id,
        },
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert ticket_resp.status_code == 200
    ticket_id = ticket_resp.json()["id"]

    refund_resp = client.post(
        "/refunds/",
        json={
            "order_id": order_id,
            "ticket_id": ticket_id,
            "amount": 12000.0,
            "reason": "Dead pixels on arrival",
            "idempotency_key": f"chat-refund-{ticket_id}-{order_id}",
        },
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert refund_resp.status_code == 200
    assert refund_resp.json()["status"] == "escalated"

    # Ticket should move to pending_review and escalation should appear for staff
    t_check = client.get(f"/tickets/{ticket_id}", headers={"Authorization": f"Bearer {customer_token}"})
    assert t_check.json()["status"] == "pending_review"

    esc_list = client.get("/escalations/", headers={"Authorization": f"Bearer {staff_token}"})
    assert esc_list.status_code == 200
    assert any(e["ticket_id"] == ticket_id and e["decision"] == "pending" for e in esc_list.json())
