import pytest


def test_create_escalation(client, customer_token):
    ticket_resp = client.post("/tickets/", json={
        "subject": "Big issue needing human review",
        "category": "refund"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket_id = ticket_resp.json()["id"]

    resp = client.post("/escalations/", json={
        "ticket_id": ticket_id,
        "summary": "Customer has a high value refund request of Rs. 8000",
        "priority": "high"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 200
    assert resp.json()["decision"] == "pending"


def test_staff_can_review_and_approve(client, customer_token, staff_token):
    ticket_resp = client.post("/tickets/", json={
        "subject": "Review needed please",
        "category": "refund"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket_id = ticket_resp.json()["id"]

    esc_resp = client.post("/escalations/", json={
        "ticket_id": ticket_id,
        "summary": "Refund request needs staff review",
        "priority": "medium"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    esc_id = esc_resp.json()["id"]

    review = client.post(f"/escalations/{esc_id}/review", json={
        "decision": "approved",
        "internal_note": "Reviewed and approved the refund request."
    }, headers={"Authorization": f"Bearer {staff_token}"})

    assert review.status_code == 200
    assert review.json()["decision"] == "approved"


def test_customer_cannot_list_escalations(client, customer_token):
    resp = client.get("/escalations/", headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 403


def test_idempotent_escalation_creation(client, customer_token):
    # creating escalation twice for same ticket should return the same record
    ticket_resp = client.post("/tickets/", json={
        "subject": "Duplicate escalation test",
        "category": "other"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    ticket_id = ticket_resp.json()["id"]

    esc1 = client.post("/escalations/", json={
        "ticket_id": ticket_id,
        "summary": "First escalation",
        "priority": "low"
    }, headers={"Authorization": f"Bearer {customer_token}"})

    esc2 = client.post("/escalations/", json={
        "ticket_id": ticket_id,
        "summary": "Second escalation attempt",
        "priority": "high"
    }, headers={"Authorization": f"Bearer {customer_token}"})

    assert esc1.status_code == 200
    assert esc2.status_code == 200
    # both should return the same escalation ID
    assert esc1.json()["id"] == esc2.json()["id"]
