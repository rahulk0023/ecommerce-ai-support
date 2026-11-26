import pytest


def test_register_success(client):
    resp = client.post("/auth/register", json={
        "name": "New User",
        "email": "newuser_auth@test.com",
        "password": "securepass123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "newuser_auth@test.com"
    assert "password_hash" not in data


def test_register_duplicate_email(client, test_customer):
    resp = client.post("/auth/register", json={
        "name": "Duplicate",
        "email": test_customer.email,
        "password": "whatever"
    })
    assert resp.status_code == 400


def test_login_success(client, test_customer):
    resp = client.post("/auth/login", json={
        "email": test_customer.email,
        "password": "testpass"
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client, test_customer):
    resp = client.post("/auth/login", json={
        "email": test_customer.email,
        "password": "wrongpassword"
    })
    assert resp.status_code == 401


def test_access_without_token(client):
    resp = client.get("/orders/")
    assert resp.status_code in [401, 403]


def test_customer_cannot_access_other_customer_order(client, delivered_order, customer_token):
    # register another customer
    client.post("/auth/register", json={
        "name": "Other User",
        "email": "other_auth@test.com",
        "password": "other1234"
    })
    other_login = client.post("/auth/login", json={
        "email": "other_auth@test.com",
        "password": "other1234"
    })
    other_token = other_login.json()["access_token"]

    resp = client.get(
        f"/orders/{delivered_order.id}",
        headers={"Authorization": f"Bearer {other_token}"}
    )
    assert resp.status_code == 403
