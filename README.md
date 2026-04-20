# GEOVISTA

GEOVISTA is a Geospatial Intelligence Fusion Dashboard that integrates OSINT, HUMINT, and IMINT data into a unified, interactive map interface for real-time analysis.

## Features

- **Multi-source data ingestion**: Upload intelligence via CSV, JSON, or images.
- **Interactive map visualization**: Auto-centering dynamic maps using Leaflet.js.
- **Hover/click popups**: Detailed popups containing metadata and images.
- **Filtering**: Filter intelligence by type (OSINT/HUMINT/IMINT) and verification status.

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Custom HTML/CSS/JS with Leaflet
- **Database**: SQLite

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/chaith17/geovista.git
   cd geovista
   ```

2. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   ```

3. Run the application:
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

4. Access the dashboard:
   Open `http://localhost:8000/` in your browser.

## Live Demo

*Deployment link coming soon...*

## Project Objective

To provide a centralized intelligence dashboard for efficient geospatial analysis.
