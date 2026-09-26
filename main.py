import os
import json
import re
import uuid
import shutil
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Union

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form, Request, status, Cookie
from fastapi.responses import JSONResponse, RedirectResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from dotenv import load_dotenv

import gemini_utils

load_dotenv()

# ==============================================================================
# FASTAPI APP INITIALIZATION & SECURITY CONFIG
# ==============================================================================
app = FastAPI(
    title="PocketSmart: AI Budget Planner",
    description="Your Smart Budget & Recommendation Assistant with Gemini 1.5 Flash Pro",
    version="2.0.0"
)

SECRET_KEY = os.getenv("SECRET_KEY", "pocketsmart_secure_default_secret_key_2025")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories & Static Mounting
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOADS_DIR = os.path.join(STATIC_DIR, "uploads")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
# Also mount assets if exists for backward compatibility
if os.path.exists(os.path.join(BASE_DIR, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(BASE_DIR, "assets")), name="assets")

templates = Jinja2Templates(directory=TEMPLATES_DIR)

# ==============================================================================
# IN-MEMORY DATA STORES & MODELS
# ==============================================================================
class UserInDB(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    hashed_password: str
    disabled: bool = False

class RegisterUser(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = None
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserSession:
    def __init__(self, username: str, token: str):
        self.username = username
        self.login_time = datetime.now(timezone.utc)
        self.last_activity = datetime.now(timezone.utc)
        self.token = token
        self.user_data = {}

class RecommendationItem(BaseModel):
    id: str
    timestamp: str
    recommendation_type: str
    input_summary: Dict[str, Any]
    full_result: Dict[str, Any]

# Pydantic Request Models
class HomeBudgetInput(BaseModel):
    total_budget: float
    num_lights: int = 4
    num_fans: int = 2
    num_furniture: int = 2
    num_dining_tables: int = 1
    has_living_room: bool = True
    has_kitchen: bool = False
    has_bedroom: bool = False
    additional_requirements: Optional[str] = None

class PartyBudgetInput(BaseModel):
    total_budget: float
    party_type: str = "Birthday"
    num_guests: int = 10
    venue_type: str = "Home"
    needs_catering: bool = True
    needs_decoration: bool = True
    needs_entertainment: bool = True
    additional_requirements: Optional[str] = None

class JewelryBudgetInput(BaseModel):
    total_budget: float
    occasion: str = "Wedding"
    preferences: Optional[str] = "Gold / Elegant"

# In-Memory Storage
users_db: Dict[str, UserInDB] = {
    "sai": UserInDB(
        username="sai",
        email="sai@pocketsmart.ai",
        full_name="Sai Krishna",
        hashed_password=pwd_context.hash("password123")
    ),
    "demo": UserInDB(
        username="demo",
        email="demo@pocketsmart.ai",
        full_name="Smart User",
        hashed_password=pwd_context.hash("demo123")
    )
}

active_sessions: Dict[str, UserSession] = {}
blacklisted_tokens = set()
user_recommendations: Dict[str, List[RecommendationItem]] = {
    "sai": [
        RecommendationItem(
            id="rec-demo-home-1",
            timestamp="2025-05-22 12:02 PM",
            recommendation_type="home",
            input_summary={"budget": 5000, "lights": 5, "fans": 4, "furniture": 2, "rooms": "Living Room, Kitchen"},
            full_result={"total_budget": 5000, "remaining_budget": 500}
        ),
        RecommendationItem(
            id="rec-demo-party-1",
            timestamp="2025-05-22 12:05 PM",
            recommendation_type="party",
            input_summary={"budget": 5000, "guests": 3, "party_type": "Wedding", "needs": "Catering, Entertainment"},
            full_result={"total_budget": 5000, "remaining_budget": 0}
        ),
        RecommendationItem(
            id="rec-demo-jewelry-1",
            timestamp="2025-05-22 12:08 PM",
            recommendation_type="jewelry",
            input_summary={"budget": 5000, "occasion": "Birthday", "has_image": True},
            full_result={"total_budget": 5000, "remaining_budget": 800}
        )
    ]
}

# ==============================================================================
# AUTHENTICATION & SECURITY UTILITIES
# ==============================================================================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_token_from_request(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    access_token_cookie: Optional[str] = Cookie(None, alias="access_token")
) -> Optional[str]:
    if bearer_token:
        return bearer_token
    if access_token_cookie:
        return access_token_cookie
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    return None

async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(get_token_from_request)
) -> Optional[UserInDB]:
    if not token or token in blacklisted_tokens:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            return None
    except JWTError:
        return None
        
    user = users_db.get(username)
    if not user:
        return None
    
    # Update active session activity
    if username in active_sessions:
        active_sessions[username].last_activity = datetime.now(timezone.utc)
        
    return user

async def get_current_active_user(
    current_user: Optional[UserInDB] = Depends(get_current_user)
) -> UserInDB:
    if not current_user:
        # Default fallback to guest demo user for frictionless testing if required
        if "sai" in users_db:
            return users_db["sai"]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def save_upload_file(upload_file: UploadFile) -> str:
    """Save an uploaded outfit image to static/uploads and return relative/absolute path."""
    ext = os.path.splitext(upload_file.filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4().hex[:12]}_{datetime.now().strftime('%Y%m%d%H%M%S')}{ext}"
    dest_path = os.path.join(UPLOADS_DIR, unique_filename)
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return dest_path

def save_to_history(username: str, recommendation_type: str, input_data: dict, result: dict):
    """Save a recommendation to in-memory history log."""
    if username not in user_recommendations:
        user_recommendations[username] = []
    
    rec_item = RecommendationItem(
        id=f"rec-{uuid.uuid4().hex[:8]}",
        timestamp=datetime.now().strftime("%b %d, %Y, %I:%M %p"),
        recommendation_type=recommendation_type,
        input_summary=input_data,
        full_result=result
    )
    user_recommendations[username].insert(0, rec_item)
    return rec_item

# ==============================================================================
# HTML TEMPLATE PAGE ROUTES
# ==============================================================================
@app.get("/", response_class=HTMLResponse)
async def home_page(request: Request, current_user: Optional[UserInDB] = Depends(get_current_user)):
    """Main landing page introducing PocketSmart AI features."""
    return templates.TemplateResponse("index.html", {"request": request, "user": current_user})

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, current_user: Optional[UserInDB] = Depends(get_current_user)):
    """Serve the login page or redirect if already authenticated."""
    if current_user:
        return RedirectResponse(url="/dashboard", status_code=status.HTTP_302_FOUND)
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request, current_user: Optional[UserInDB] = Depends(get_current_user)):
    """Serve the registration page."""
    if current_user:
        return RedirectResponse(url="/dashboard", status_code=status.HTTP_302_FOUND)
    return templates.TemplateResponse("register.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse)
async def user_dashboard(request: Request, current_user: UserInDB = Depends(get_current_active_user)):
    """User dashboard showing recent activity, stats, and quick links to planners."""
    history = user_recommendations.get(current_user.username, [])
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "user": current_user,
        "recent_history": history[:5]
    })

@app.get("/home-planner", response_class=HTMLResponse)
async def home_planner_page(request: Request, current_user: UserInDB = Depends(get_current_active_user)):
    """Home interior budget planner page."""
    return templates.TemplateResponse("home_planner.html", {"request": request, "user": current_user})

@app.get("/party-planner", response_class=HTMLResponse)
async def party_planner_page(request: Request, current_user: UserInDB = Depends(get_current_active_user)):
    """Party budget planner page."""
    return templates.TemplateResponse("party_planner.html", {"request": request, "user": current_user})

@app.get("/jewelry-planner", response_class=HTMLResponse)
async def jewelry_planner_page(request: Request, current_user: UserInDB = Depends(get_current_active_user)):
    """Jewelry budget planner page."""
    return templates.TemplateResponse("jewelry_planner.html", {"request": request, "user": current_user})

@app.get("/history", response_class=HTMLResponse)
async def history_page(request: Request, current_user: UserInDB = Depends(get_current_active_user)):
    """History page to view past recommendations."""
    history = user_recommendations.get(current_user.username, [])
    return templates.TemplateResponse("history.html", {
        "request": request,
        "user": current_user,
        "history": history
    })

# ==============================================================================
# AUTHENTICATION API ENDPOINTS
# ==============================================================================
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user credentials and issue a JWT token with cookie."""
    user = users_db.get(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )

    # Manage user session
    active_sessions[user.username] = UserSession(username=user.username, token=access_token)

    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )
    return response

@app.post("/register")
async def register_user_api(user_data: RegisterUser):
    """Handle new user registration."""
    if user_data.username in users_db:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    new_user = UserInDB(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name or user_data.username.capitalize(),
        hashed_password=get_password_hash(user_data.password)
    )
    users_db[user_data.username] = new_user
    user_recommendations[user_data.username] = []
    
    # Automatically log them in
    access_token = create_access_token(data={"sub": new_user.username})
    active_sessions[new_user.username] = UserSession(username=new_user.username, token=access_token)

    response = JSONResponse(content={"message": "User registered successfully", "access_token": access_token})
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )
    return response

@app.post("/logout")
@app.get("/logout")
async def logout(
    request: Request,
    token: Optional[str] = Depends(get_token_from_request)
):
    """Logout user by blacklisting token and clearing session cookie."""
    if token:
        blacklisted_tokens.add(token)
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if username and username in active_sessions:
                del active_sessions[username]
        except JWTError:
            pass

    response = RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)
    response.delete_cookie(key="access_token")
    return response

# ==============================================================================
# SESSION INFO & DATA ENDPOINTS
# ==============================================================================
@app.get("/session-info")
async def get_session_info(
    request: Request,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Retrieve metadata about the current user session."""
    if current_user.username in active_sessions:
        session = active_sessions[current_user.username]
        now = datetime.now(timezone.utc)
        duration_sec = int((now - session.login_time).total_seconds())
        return {
            "username": session.username,
            "full_name": current_user.full_name,
            "login_time": session.login_time.isoformat(),
            "last_activity": session.last_activity.isoformat(),
            "session_duration_minutes": duration_sec // 60,
            "user_data": session.user_data
        }
    return {
        "username": current_user.username,
        "full_name": current_user.full_name,
        "login_time": datetime.now(timezone.utc).isoformat(),
        "session_duration_minutes": 0,
        "user_data": {}
    }

@app.post("/session-data")
async def update_session_data(
    data: Dict[str, Any],
    request: Request,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Update session specific data."""
    if current_user.username in active_sessions:
        active_sessions[current_user.username].user_data.update(data)
        active_sessions[current_user.username].last_activity = datetime.now(timezone.utc)
        return {"message": "Session data updated", "data": active_sessions[current_user.username].user_data}
    return {"message": "Session updated"}

# ==============================================================================
# RECOMMENDATION ENGINE API ENDPOINTS (Home, Party, Jewelry)
# ==============================================================================

# 1. Home Interior Planner
@app.post("/home-budget")
@app.post("/generate-home")
async def plan_home_budget(
    budget_input: HomeBudgetInput,
    request: Request,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Generate home interior budget recommendations."""
    # Track in active sessions
    if current_user.username in active_sessions:
        active_sessions[current_user.username].user_data["last_home_budget"] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "budget": budget_input.total_budget,
            "requirements": budget_input.model_dump()
        }

    # Generate recommendations using Gemini
    result = gemini_utils.get_home_recommendations(budget_input)

    # Save to history
    save_to_history(
        username=current_user.username,
        recommendation_type="home",
        input_data=budget_input.model_dump(),
        result=result
    )

    return result

# 2. Party Budget Planner
@app.post("/party-budget")
@app.post("/generate-party")
async def plan_party_budget(
    budget_input: PartyBudgetInput,
    request: Request,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Generate party planning recommendations across venue, catering, decor."""
    if current_user.username in active_sessions:
        active_sessions[current_user.username].user_data["last_party_budget"] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "budget": budget_input.total_budget,
            "party_type": budget_input.party_type,
            "guests": budget_input.num_guests
        }

    result = gemini_utils.get_party_recommendations(budget_input)

    save_to_history(
        username=current_user.username,
        recommendation_type="party",
        input_data=budget_input.model_dump(),
        result=result
    )

    return result

# 3. Jewelry Budget Planner (Multimodal Text + Image)
@app.post("/jewelry-budget")
@app.post("/generate-jewelry")
async def plan_jewelry_budget(
    total_budget: float = Form(...),
    occasion: str = Form(...),
    preferences: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    request: Request = None,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Generate jewelry budget recommendations with optional outfit image."""
    budget_input = JewelryBudgetInput(
        total_budget=total_budget,
        occasion=occasion,
        preferences=preferences or "Elegant Gold / Silver Polish"
    )

    image_path = None
    image_rel_url = None
    if image and image.filename:
        image_path = save_upload_file(image)
        image_rel_url = f"/static/uploads/{os.path.basename(image_path)}"

    if current_user.username in active_sessions:
        active_sessions[current_user.username].user_data["last_jewelry_budget"] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "budget": budget_input.total_budget,
            "occasion": budget_input.occasion,
            "has_image": image is not None
        }

    result = gemini_utils.get_jewelry_recommendations(budget_input, image_path)
    if image_rel_url:
        result["uploaded_image_url"] = image_rel_url

    history_input = budget_input.model_dump()
    if image and image.filename:
        history_input["image"] = image.filename
        history_input["has_image"] = True

    save_to_history(
        username=current_user.username,
        recommendation_type="jewelry",
        input_data=history_input,
        result=result
    )

    return result

# ==============================================================================
# RECOMMENDATION HISTORY & DETAILS ENDPOINTS
# ==============================================================================
@app.get("/recommendation-history")
async def get_recommendation_history(
    request: Request,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get the logged in user's past recommendation logs."""
    history = user_recommendations.get(current_user.username, [])
    history_data = []
    for item in history:
        history_data.append({
            "id": item.id,
            "timestamp": item.timestamp,
            "type": item.recommendation_type,
            "input": item.input_summary,
            "summary": {
                "total_budget": item.full_result.get("total_budget", 0),
                "remaining_budget": item.full_result.get("remaining_budget", 0)
            }
        })
    return {"history": history_data}

@app.get("/recommendations-details/{recommendation_id}")
@app.get("/recommendation-details/{recommendation_id}")
async def get_recommendation_details(
    recommendation_id: str,
    request: Request,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Retrieve full details for a specific recommendation query."""
    user_recs = user_recommendations.get(current_user.username, [])
    for item in user_recs:
        if item.id == recommendation_id:
            return {
                "id": item.id,
                "timestamp": item.timestamp,
                "type": item.recommendation_type,
                "input": item.input_summary,
                "full_result": item.full_result
            }
    raise HTTPException(status_code=404, detail="Recommendation not found")

# ==============================================================================
# STARTUP BACKGROUND CLEANUP & MAIN RUNNER
# ==============================================================================
@app.on_event("startup")
async def setup_session_cleanup():
    """Background task to clean up expired sessions."""
    async def cleanup_expired_sessions():
        while True:
            current_time = datetime.now(timezone.utc)
            expired = [
                uname for uname, sess in list(active_sessions.items())
                if (current_time - sess.last_activity).total_seconds() > 1800
            ]
            for uname in expired:
                print(f"Removing expired session for {uname}")
                active_sessions.pop(uname, None)
            await asyncio.sleep(300)
    
    asyncio.create_task(cleanup_expired_sessions())

if __name__ == "__main__":
    import uvicorn
    print("Starting PocketSmart: AI Budget Planner on port 8000...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
