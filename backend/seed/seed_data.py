"""
Seed sample data for local testing.
Usage: python seed/seed_data.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from datetime import date, timedelta
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.services.auth_service import hash_password


def seed():
    db = SessionLocal()

    try:
        if db.query(User).count() > 0:
            print("Database already has data, skipping seed.")
            return

        print("Seeding users...")

        customers = [
            User(name="Rahul Sharma", email="rahul@example.com",
                 password_hash=hash_password("test1234"), role=UserRole.customer),
            User(name="Priya Patel", email="priya@example.com",
                 password_hash=hash_password("test1234"), role=UserRole.customer),
            User(name="Amit Gupta", email="amit@example.com",
                 password_hash=hash_password("test1234"), role=UserRole.customer),
        ]

        staff = [
            User(name="Support Agent", email="agent@support.com",
                 password_hash=hash_password("staff1234"), role=UserRole.staff),
            User(name="Admin User", email="admin@support.com",
                 password_hash=hash_password("admin1234"), role=UserRole.admin),
        ]

        for u in customers + staff:
            db.add(u)
        db.flush()

        print("Seeding orders...")

        today = date.today()
        orders = [
            Order(customer_id=customers[0].id, status=OrderStatus.delivered,
                  delivery_date=today - timedelta(days=3),
                  total_amount=2500.0, item_category="electronics",
                  item_details='{"name": "Wireless Earbuds", "qty": 1}'),
            Order(customer_id=customers[0].id, status=OrderStatus.delivered,
                  delivery_date=today - timedelta(days=15),  # outside return window
                  total_amount=1200.0, item_category="clothing",
                  item_details='{"name": "Cotton Shirt", "qty": 2}'),
            Order(customer_id=customers[0].id, status=OrderStatus.delivered,
                  delivery_date=today - timedelta(days=1),
                  total_amount=8500.0, item_category="electronics",
                  item_details='{"name": "Smartwatch", "qty": 1}'),
            Order(customer_id=customers[1].id, status=OrderStatus.shipped,
                  total_amount=3200.0, item_category="home",
                  item_details='{"name": "Coffee Maker", "qty": 1}'),
            Order(customer_id=customers[2].id, status=OrderStatus.delivered,
                  delivery_date=today - timedelta(days=2),
                  total_amount=4500.0, item_category="electronics",
                  item_details='{"name": "Bluetooth Speaker", "qty": 1}'),
        ]

        for o in orders:
            db.add(o)

        db.commit()
        print(f"Seeded {len(customers)} customers, {len(staff)} staff, {len(orders)} orders.")
        print("\nTest accounts:")
        print("  Customer : rahul@example.com  / test1234")
        print("  Staff    : agent@support.com  / staff1234")
        print("  Admin    : admin@support.com  / admin1234")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
