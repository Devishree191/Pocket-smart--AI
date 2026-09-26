# PocketSmart AI: Your Smart Budget & Recommendation Assistant

**PocketSmart AI** is a GenAI-powered, cross-platform recommendation system that delivers personalized, budget-based suggestions for products and services across **Home Interiors**, **Party Planning**, and **Jewelry Matching**.

Powered by **Google Gemini 1.5 Flash Pro** and **FastAPI**, PocketSmart AI transforms budgeting into an intelligent, interactive experience that bridges multiple e-commerce ecosystems (Amazon, Flipkart, IKEA, Swiggy, Zomato, OYO, MakeMyTrip, Tanishq, CaratLane, BlueStone, Melorra, Meesho).

---

## 🌟 Key Scenarios & Features

### 1. Home Interior Planning with Smart Budget Allocation
- Specify budget, rooms (Living Room, Kitchen, Bedroom), and quantities for lights, ceiling fans, furniture, and dining sets.
- AI recommends cost-effective, stylish items available in India.
- Dynamic deep-links to **IKEA, Amazon, Flipkart, Myntra, and Ajio**.
- Real-time category allocation breakdown and energy-saving suggestions.

### 2. AI-Based Party Budget Planning
- Input total budget, guest count, party type (Wedding, Birthday, Corporate, Anniversary), and venue type.
- Proportional budget allocation across catering, decoration, entertainment, and contingency buffer.
- Sourcing options from **Swiggy, Zomato, BigBasket, BookMyShow, OYO, MakeMyTrip, and NoBroker**.

### 3. Jewelry Recommendations with Multimodal Vision
- Enter budget, occasion, and style preferences.
- **Multimodal Image Upload**: Upload an outfit photo for Gemini Vision to analyze colors, style, and formality.
- Tailored jewelry suggestions from **Tanishq, CaratLane, BlueStone, Melorra, Meesho, and Amazon**.
- Curated styling tips and metal coordination advice.

### 4. User Authentication & Recommendation History
- Secure authentication with JWT tokens (`/token`, `/login`, `/register`, `/logout`).
- Personalized user dashboard with recent activity and stats.
- Complete recommendation history logs (`/history`, `/recommendation-details/{id}`).

---

## 📂 Project Architecture

```
Open-Smart-AI/
├── main.py                  # FastAPI application with routes, JWT auth & sessions
├── app.py                   # Alternative entrypoint runner
├── gemini_utils.py          # Gemini 1.5 Flash Pro AI integration & fallback engine
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables (API keys, JWT secret)
├── static/
│   ├── styles.css           # Modern design system & responsive styling
│   └── uploads/             # Directory for uploaded outfit images
├── templates/
│   ├── index.html           # Landing page
│   ├── login.html           # Sign In page
│   ├── register.html        # Registration page
│   ├── dashboard.html       # User Dashboard
│   ├── home_planner.html    # Home Interior Budget Planner
│   ├── party_planner.html   # Party Budget Planner
│   ├── jewelry_planner.html # Jewelry Budget Planner (Multimodal)
│   └── history.html         # Recommendation History & Details modal
└── index.html               # Master root entrypoint
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Edit `.env` and add your Google Gemini API Key:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
SECRET_KEY=pocketsmart_super_secure_jwt_secret_key_2025_ai_planner
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```
*(Note: If no API key is set, the system automatically uses its built-in rule-based calculation engine so all features continue to work seamlessly!)*

### 3. Run the FastAPI Server
```bash
python main.py
```
or
```bash
uvicorn main:app --reload --port 8000
```

Open your browser at:
**http://127.0.0.1:8000**

---

## 🔑 Default Demo Credentials
- **Username**: `sai`
- **Password**: `password123`
- *(Or register any new account via the `/register` page)*

---

## 📑 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Home Landing Page |
| `GET` | `/dashboard` | User Dashboard |
| `GET` | `/home-planner` | Home Interior Planner UI |
| `GET` | `/party-planner` | Party Planner UI |
| `GET` | `/jewelry-planner` | Jewelry Planner UI |
| `GET` | `/history` | Recommendation History UI |
| `POST` | `/token` | Authenticate & issue JWT token |
| `POST` | `/register` | Create user account |
| `POST` | `/logout` | Logout & clear session |
| `POST` | `/home-budget` | Generate home interior recommendations |
| `POST` | `/party-budget` | Generate party planning recommendations |
| `POST` | `/jewelry-budget`| Generate jewelry recommendations (Multimodal image + text) |
| `GET` | `/recommendation-history` | Fetch user's past recommendation logs |
| `GET` | `/recommendation-details/{id}` | Get full details for a saved plan |
| `GET` | `/session-info` | Session metadata and duration |
