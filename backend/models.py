from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    recently_seen = relationship("RecentlySeen", back_populates="user", cascade="all, delete-orphan")
    saved_stocks = relationship("SavedStock", back_populates="user", cascade="all, delete-orphan")


class RecentlySeen(Base):
    __tablename__ = "recently_seen"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=True)
    viewed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recently_seen")

    __table_args__ = (UniqueConstraint("user_id", "symbol", name="uq_recently_seen_user_symbol"),)


class SavedStock(Base):
    __tablename__ = "saved_stocks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    name = Column(String, nullable=False)
    saved_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="saved_stocks")

    __table_args__ = (UniqueConstraint("user_id", "symbol", name="uq_saved_user_symbol"),)
