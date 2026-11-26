import pytest


def test_create_ticket(client, customer_token, delivered_order):
    resp = client.post("/tickets/", json={
        "subject": "My order has an issue",
        "description": "The item I received looks damaged.",
        "category": "product",
        "order_id": delivered_order.id
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["subject"] == "My order has an issue"
    assert data["status"] == "open"


def test_customer_can_view_own_ticket(client, customer_token):
    create_resp = client.post("/tickets/", json={
        "subject": "Test ticket",
        "category": "other"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket_id = create_resp.json()["id"]

    resp = client.get(f"/tickets/{ticket_id}", headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 200


def test_staff_can_update_ticket_status(client, staff_token, customer_token):
    create = client.post("/tickets/", json={
        "subject": "Need help with my order",
        "category": "other"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket_id = create.json()["id"]

    resp = client.patch(
        f"/tickets/{ticket_id}/status",
        json={"status": "resolved"},
        headers={"Authorization": f"Bearer {staff_token}"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "resolved"


def test_customer_cannot_update_ticket_status(client, customer_token):
    create = client.post("/tickets/", json={
        "subject": "Some issue",
        "category": "other"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket_id = create.json()["id"]

    resp = client.patch(
        f"/tickets/{ticket_id}/status",
        json={"status": "resolved"},
        headers={"Authorization": f"Bearer {customer_token}"}
    )
    assert resp.status_code == 403
