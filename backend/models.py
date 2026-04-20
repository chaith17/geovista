from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from database import Base
import datetime

class IntelligencePoint(Base):
    __tablename__ = "intelligence_points"

    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    type = Column(String, index=True, nullable=False) # OSINT/HUMINT/IMINT
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="unverified") # verified/unverified
