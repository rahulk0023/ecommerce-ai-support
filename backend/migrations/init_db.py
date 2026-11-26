"""
Run once to create all database tables.
Usage: python migrations/init_db.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.database import engine, Base
# import all models so SQLAlchemy knows about them
from app.models import User, Order, Ticket, Message, Refund, Escalation


def init():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Done.")


if __name__ == "__main__":
    init()
