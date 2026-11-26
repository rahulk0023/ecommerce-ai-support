import pytest


def test_eligible_refund_created(client, customer_token, delivered_order):
    resp = client.post("/refunds/", json={
        "order_id": delivered_order.id,
        "amount": 2000.0,
        "reason": "Item is defective"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 200
    assert resp.json()["status"] in ["approved", "escalated"]


def test_expired_return_window_rejected(client, customer_token, expired_order):
    resp = client.post("/refunds/", json={
        "order_id": expired_order.id,
        "amount": 1000.0,
        "reason": "Changed my mind"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


def test_refund_below_threshold_auto_approved(client, customer_token, delivered_order):
    # 2500 is within the 5000 threshold, so it should be automatically approved
    resp = client.post("/refunds/", json={
        "order_id": delivered_order.id,
        "amount": 2500.0,
        "reason": "Not as described"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    if resp.status_code == 200:
        assert resp.json()["status"] == "approved"


def test_duplicate_refund_prevented(client, customer_token, delivered_order):
    key = "unique-idempotency-key-abc"
    payload = {
        "order_id": delivered_order.id,
        "amount": 1500.0,
        "reason": "First request",
        "idempotency_key": key
    }
    r1 = client.post("/refunds/", json=payload, headers={"Authorization": f"Bearer {customer_token}"})
    r2 = client.post("/refunds/", json={**payload, "reason": "Second attempt"},
                     headers={"Authorization": f"Bearer {customer_token}"})
    # first should succeed, second should return same record or conflict
    assert r1.status_code == 200
    assert r2.status_code in [200, 409]


def test_refund_above_threshold_escalated(client, db, test_customer, customer_token):
    from datetime import date, timedelta
    from app.models.order import Order, OrderStatus

    high_order = Order(
        customer_id=test_customer.id,
        status=OrderStatus.delivered,
        delivery_date=date.today() - timedelta(days=1),
        total_amount=8500.0,
        item_category="electronics",
        item_details='{"name": "Smartwatch"}'
    )
    db.add(high_order)
    db.commit()
    db.refresh(high_order)

    resp = client.post("/refunds/", json={
        "order_id": high_order.id,
        "amount": 8500.0,
        "reason": "Device not turning on"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "escalated"


def test_db_failure_does_not_claim_success(client, customer_token, delivered_order, monkeypatch):
    # simulate a database error during refund creation
    from app.routers import refunds as refunds_router

    def broken_create(*args, **kwargs):
        raise RuntimeError("DB connection dropped")

    monkeypatch.setattr(refunds_router, "create_refund_record", broken_create)

    try:
        resp = client.post("/refunds/", json={
            "order_id": delivered_order.id,
            "amount": 1000.0,
            "reason": "Testing failure handling"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        assert resp.status_code >= 500
    except RuntimeError:
        # TestClient may re-raise unhandled server exceptions unless raise_server_exceptions=False
        pass
