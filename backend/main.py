from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import uuid
import os
import shutil
import datetime

from database import engine, Base, get_db
import models

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="GEOVISTA API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for the dashboard
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Frontend directory
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "../frontend")
os.makedirs(FRONTEND_DIR, exist_ok=True)

from pydantic import BaseModel
class PointCreate(BaseModel):
    latitude: float
    longitude: float
    type: str # OSINT/HUMINT/IMINT
    description: str
    image_url: Optional[str] = None
    status: Optional[str] = "unverified"

@app.get("/api/points/")
def get_points(type: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.IntelligencePoint)
    if type:
        query = query.filter(models.IntelligencePoint.type == type)
    if status:
        query = query.filter(models.IntelligencePoint.status == status)
    return query.all()

@app.post("/api/points/")
def create_point(point: PointCreate, db: Session = Depends(get_db)):
    db_point = models.IntelligencePoint(**point.dict())
    db.add(db_point)
    db.commit()
    db.refresh(db_point)
    return db_point

@app.post("/api/upload/csv")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
    
    try:
        df = pd.read_csv(file.file)
        required_cols = {'latitude', 'longitude'}
        if not required_cols.issubset(df.columns.str.lower()):
            raise HTTPException(status_code=400, detail="CSV must contain 'latitude' and 'longitude' columns")
        
        # Make column names lowercase for easier matching
        df.columns = df.columns.str.lower()
        
        points_added = 0
        for _, row in df.iterrows():
            if pd.isna(row.get('latitude')) or pd.isna(row.get('longitude')):
                continue
            
            p_type = str(row.get('type', 'OSINT'))
            p_desc = str(row.get('description', ''))
            if pd.isna(row.get('type')): p_type = 'OSINT'
            if pd.isna(row.get('description')): p_desc = ''
            
            db_point = models.IntelligencePoint(
                latitude=float(row['latitude']),
                longitude=float(row['longitude']),
                type=p_type,
                description=p_desc,
                status=str(row.get('status', 'unverified')) if not pd.isna(row.get('status')) else 'unverified'
            )
            db.add(db_point)
            points_added += 1
            
        db.commit()
        return {"message": f"Successfully uploaded {points_added} points from CSV"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload/image")
async def upload_image(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
        raise HTTPException(status_code=400, detail="Only images are allowed")
    
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/uploads/{filename}"}

app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
