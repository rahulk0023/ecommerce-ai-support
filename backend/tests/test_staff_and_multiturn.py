import pytest


def test_users_endpoint_rbac(client, test_customer, customer_token, staff_token):
    me = client.get("/users/me", headers={"Authorization": f"Bearer {customer_token}"})
    assert me.status_code == 200
    assert me.json()["email"] == test_customer.email

    # customer cannot list all users
    blocked = client.get("/users/", headers={"Authorization": f"Bearer {customer_token}"})
    assert blocked.status_code == 403

    # staff can list users
    allowed = client.get("/users/", headers={"Authorization": f"Bearer {staff_token}"})
    assert allowed.status_code == 200
    assert len(allowed.json()) >= 1


def test_staff_can_inspect_customer_order(client, delivered_order, staff_token):
    resp = client.get(f"/orders/{delivered_order.id}", headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 200
    assert resp.json()["id"] == delivered_order.id


def test_staff_reply_does_not_trigger_ai(client, customer_token, staff_token):
    t = client.post("/tickets/", json={
        "subject": "Delivery issue",
        "category": "shipping"
    }, headers={"Authorization": f"Bearer {customer_token}"}).json()

    resp = client.post("/messages/", json={
        "ticket_id": t["id"],
        "content": "We are checking this with our courier partner."
    }, headers={"Authorization": f"Bearer {staff_token}"})

    assert resp.status_code == 200
    msgs = resp.json()
    assert len(msgs) == 1
    assert msgs[0]["sender_type"] == "staff"


def test_staff_can_filter_and_search_tickets(client, customer_token, staff_token):
    client.post("/tickets/", json={"subject": "Broken charger", "category": "product"},
                headers={"Authorization": f"Bearer {customer_token}"})
    client.post("/tickets/", json={"subject": "Late parcel", "category": "shipping"},
                headers={"Authorization": f"Bearer {customer_token}"})

    resp = client.get("/tickets/?q=charger&status=open", headers={"Authorization": f"Bearer {staff_token}"})
    assert resp.status_code == 200
    subjects = [x["subject"] for x in resp.json()]
    assert "Broken charger" in subjects
    assert "Late parcel" not in subjects


def test_staff_can_approve_refund_directly(client, customer_token, staff_token):
    high_order = client.post("/orders/", json={
        "item_category": "electronics",
        "item_details": "Monitor",
        "total_amount": 7500.0,
        "status": "delivered"
    }, headers={"Authorization": f"Bearer {customer_token}"}).json()

    rf = client.post("/refunds/", json={
        "order_id": high_order["id"],
        "amount": 7500.0,
        "reason": "Defective unit"
    }, headers={"Authorization": f"Bearer {customer_token}"}).json()
    assert rf["status"] == "escalated"

    # customer cannot approve their own refund
    forbidden = client.post(
        f"/refunds/{rf['id']}/review",
        json={"decision": "approved"},
        headers={"Authorization": f"Bearer {customer_token}"}
    )
    assert forbidden.status_code == 403

    # staff approves it
    approved = client.post(
        f"/refunds/{rf['id']}/review",
        json={"decision": "approved"},
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"


def test_multiturn_refund_with_short_order_id_followup(client, customer_token, delivered_order):
    t = client.post("/tickets/", json={
        "subject": "Refund inquiry",
        "category": "refund"
    }, headers={"Authorization": f"Bearer {customer_token}"}).json()

    # Turn 1: missing order ID
    r1 = client.post("/agent/chat", json={
        "ticket_id": t["id"],
        "message": "I want a refund"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert r1.status_code == 200
    assert "order id" in r1.json()["reply"].lower()

    # Turn 2: user replies with just the order ID
    r2 = client.post("/agent/chat", json={
        "ticket_id": t["id"],
        "message": f"#{delivered_order.id}"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert r2.status_code == 200
    assert "initiated" in r2.json()["reply"].lower() or "escalated" in r2.json()["reply"].lower()
