import os
import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.services.auth_service import hash_password, create_token
from datetime import date, timedelta

# load root .env if present so tests pick up the local postgres password
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv()

_default_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/ecommerce_support")
if "@db:" in _default_url and not os.path.exists("/.dockerenv"):
    _default_url = _default_url.replace("@db:", "@localhost:")
_derived_test_url = _default_url.rsplit("/", 1)[0] + "/ecommerce_support_test"
TEST_DB_URL = os.getenv("TEST_DATABASE_URL", _derived_test_url)

engine = create_engine(TEST_DB_URL)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSession(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def test_customer(db):
    usr = User(
        name="Test Customer",
        email="testcust@test.com",
        password_hash=hash_password("testpass"),
        role=UserRole.customer
    )
    db.add(usr)
    db.commit()
    db.refresh(usr)
    return usr


@pytest.fixture
def test_staff(db):
    usr = User(
        name="Test Staff",
        email="teststaff@test.com",
        password_hash=hash_password("testpass"),
        role=UserRole.staff
    )
    db.add(usr)
    db.commit()
    db.refresh(usr)
    return usr


@pytest.fixture
def customer_token(test_customer):
    return create_token({"sub": str(test_customer.id), "role": "customer"})


@pytest.fixture
def staff_token(test_staff):
    return create_token({"sub": str(test_staff.id), "role": "staff"})


@pytest.fixture
def delivered_order(db, test_customer):
    order = Order(
        customer_id=test_customer.id,
        status=OrderStatus.delivered,
        delivery_date=date.today() - timedelta(days=2),
        total_amount=3000.0,
        item_category="electronics",
        item_details='{"name": "Headphones"}'
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@pytest.fixture
def expired_order(db, test_customer):
    # outside the 7-day return window
    order = Order(
        customer_id=test_customer.id,
        status=OrderStatus.delivered,
        delivery_date=date.today() - timedelta(days=20),
        total_amount=1500.0,
        item_category="clothing",
        item_details='{"name": "Jacket"}'
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
