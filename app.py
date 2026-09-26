"""
PocketSmart AI: Backend Entrypoint (app.py)
Imports and exposes FastAPI application from main.py
"""
import uvicorn
from main import app

if __name__ == "__main__":
    print("Launching PocketSmart AI on http://127.0.0.1:8000 ...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
