import os
import json
import re
import urllib.parse
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Try importing PIL for multimodal image processing
try:
    from PIL import Image
except ImportError:
    Image = None

# Try importing google.generativeai
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

load_dotenv()

# Configure Gemini AI
API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("Google_API_KEY")
model = None

if HAS_GENAI and API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        # Using gemini-1.5-flash as specified in project specifications
        model = genai.GenerativeModel("gemini-1.5-flash")
    except Exception as e:
        print(f"Warning: Failed to configure Gemini API: {e}")
        model = None


def extract_json_from_response(text: str) -> dict:
    """Extract and parse JSON safely from Gemini model response."""
    if not text:
        return {}
    try:
        # Strip markdown codeblocks if present
        clean_text = re.sub(r"^```(?:json)?", "", text.strip(), flags=re.MULTILINE)
        clean_text = re.sub(r"```$", "", clean_text.strip(), flags=re.MULTILINE)
        clean_text = clean_text.strip()
        
        # Try direct parse
        return json.loads(clean_text)
    except Exception:
        # Fallback to finding the first { and last }
        try:
            start_idx = text.find("{")
            end_idx = text.rfind("}")
            if start_idx != -1 and end_idx != -1:
                json_str = text[start_idx:end_idx + 1]
                return json.loads(json_str)
        except Exception as err:
            print(f"JSON extraction error: {err}")
    return {}


def usd_to_inr(amount_usd: float, exchange_rate: float = 83.0) -> float:
    """Convert USD amount to INR using the specified exchange rate."""
    return round(amount_usd * exchange_rate, 2)


# ==============================================================================
# SCENARIO 1: HOME INTERIOR RECOMMENDATIONS
# ==============================================================================
def get_home_recommendations(budget_input) -> dict:
    """Generate home interior recommendations within budget for Indian market."""
    total_budget = float(getattr(budget_input, 'total_budget', 5000))
    num_lights = int(getattr(budget_input, 'num_lights', 2))
    num_fans = int(getattr(budget_input, 'num_fans', 1))
    num_furniture = int(getattr(budget_input, 'num_furniture', 2))
    num_dining_tables = int(getattr(budget_input, 'num_dining_tables', 1))
    
    rooms = []
    if getattr(budget_input, 'has_living_room', False):
        rooms.append("Living Room")
    if getattr(budget_input, 'has_kitchen', False):
        rooms.append("Kitchen")
    if getattr(budget_input, 'has_bedroom', False):
        rooms.append("Bedroom")
    if not rooms:
        rooms = ["Living Room"]
        
    additional_reqs = getattr(budget_input, 'additional_requirements', "") or "Standard modern and cost-effective home decor"

    prompt = f"""
I need interior design product recommendations for a home in India with a total budget of ₹{total_budget:.2f}.
Requirements:
- {num_lights} lights/lighting fixtures
- {num_fans} ceiling fans
- {num_furniture} furniture pieces
- {num_dining_tables} dining tables
Rooms to consider: {", ".join(rooms)}
Additional requirements: {additional_reqs}

Please provide a detailed budget breakdown with product recommendations available in India.
Use Indian brands and pricing in INR (₹). Include search terms suitable for Indian shopping platforms.

Format your response strictly as valid JSON with the following structure:
{{
  "total_budget": {total_budget:.2f},
  "budget_breakdown": [
    {{
      "category": "Lighting",
      "allocation": 0.0,
      "items": [
        {{
          "name": "Smart LED Ceiling Light",
          "description": "Energy efficient warm white LED bulb/panel",
          "estimated_price": 0.0,
          "quantity": {num_lights},
          "search_terms": "Philips LED Smart Ceiling Light"
        }}
      ]
    }},
    {{
      "category": "Ceiling Fans",
      "allocation": 0.0,
      "items": [
        {{
          "name": "BLDC Energy Saver Fan",
          "description": "High air delivery silent ceiling fan with remote",
          "estimated_price": 0.0,
          "quantity": {num_fans},
          "search_terms": "Atomberg Crompton BLDC Ceiling Fan"
        }}
      ]
    }},
    {{
      "category": "Furniture",
      "allocation": 0.0,
      "items": [
        {{
          "name": "Compact 2-Seater Sofa / Ergonomic Chairs",
          "description": "Comfortable seating for living space",
          "estimated_price": 0.0,
          "quantity": {num_furniture},
          "search_terms": "Wooden 2 Seater Compact Sofa"
        }}
      ]
    }},
    {{
      "category": "Dining",
      "allocation": 0.0,
      "items": [
        {{
          "name": "Modern Wooden Dining Set",
          "description": "Sturdy space-saving dining table",
          "estimated_price": 0.0,
          "quantity": {num_dining_tables},
          "search_terms": "Solid Wood 4 Seater Dining Table Set"
        }}
      ]
    }}
  ],
  "calculation_table": [
    {{
      "category": "Lighting",
      "items_count": {num_lights},
      "total_cost": 0.0,
      "percentage_of_budget": 0.0
    }}
  ],
  "remaining_budget": 0.0,
  "additional_suggestions": [
    "Consider purchasing multi-functional furniture to maximize space.",
    "Look for seasonal sales on festive e-commerce discounts.",
    "Prioritize BLDC energy star appliances for long-term power savings."
  ]
}}
Ensure all costs are in INR and total does not exceed the given budget.
"""

    result = None
    if model:
        try:
            response = model.generate_content(prompt)
            result = extract_json_from_response(response.text)
        except Exception as e:
            print(f"Gemini API home planner error: {e}")
            result = None

    # Fallback if AI call failed or returned empty
    if not result or "budget_breakdown" not in result or not result["budget_breakdown"]:
        result = _generate_fallback_home_recommendations(total_budget, num_lights, num_fans, num_furniture, num_dining_tables, rooms, additional_reqs)

    # Attach shopping links dynamically
    for category in result.get("budget_breakdown", []):
        for item in category.get("items", []):
            search_terms = item.get("search_terms") or item.get("name", "home decor")
            encoded_query = urllib.parse.quote_plus(search_terms)
            item["shopping_links"] = {
                "amazon": f"https://www.amazon.in/s?k={encoded_query}",
                "flipkart": f"https://www.flipkart.com/search?q={encoded_query}",
                "ikea": f"https://www.ikea.com/in/en/search/?q={encoded_query}",
                "myntra": f"https://www.myntra.com/{encoded_query}",
                "ajio": f"https://www.ajio.com/search/?text={encoded_query}"
            }

    # Ensure calculation table is properly formatted
    if "calculation_table" not in result or not result["calculation_table"]:
        calc_table = []
        for category in result.get("budget_breakdown", []):
            cat_name = category.get("category", "General")
            items = category.get("items", [])
            total_cat_cost = sum(float(it.get("estimated_price", 0)) * int(it.get("quantity", 1)) for it in items)
            pct = round((total_cat_cost / total_budget * 100), 1) if total_budget > 0 else 0
            calc_table.append({
                "category": cat_name,
                "items_count": sum(int(it.get("quantity", 1)) for it in items),
                "total_cost": round(total_cat_cost, 2),
                "percentage_of_budget": pct
            })
        result["calculation_table"] = calc_table

    return result


def _generate_fallback_home_recommendations(total_budget, num_lights, num_fans, num_furniture, num_dining, rooms, reqs):
    """Accurate offline calculation engine for Home Interior Planner."""
    allocations = {
        "Lighting": 0.15,
        "Ceiling Fans": 0.25,
        "Furniture": 0.35,
        "Dining": 0.20
    }
    
    lighting_budget = total_budget * allocations["Lighting"]
    fans_budget = total_budget * allocations["Ceiling Fans"]
    furniture_budget = total_budget * allocations["Furniture"]
    dining_budget = total_budget * allocations["Dining"]
    
    light_unit_price = round(lighting_budget / max(num_lights, 1), 2)
    fan_unit_price = round(fans_budget / max(num_fans, 1), 2)
    furniture_unit_price = round(furniture_budget / max(num_furniture, 1), 2)
    dining_unit_price = round(dining_budget / max(num_dining, 1), 2)
    
    breakdown = [
        {
            "category": "Lighting",
            "allocation": round(lighting_budget, 2),
            "items": [
                {
                    "name": "Philips / Wipro Warm White LED Fixtures",
                    "description": f"Energy-efficient modern ambient lighting for {', '.join(rooms)}",
                    "estimated_price": light_unit_price,
                    "quantity": num_lights,
                    "search_terms": "Philips Warm White LED Panel Downlight"
                }
            ]
        },
        {
            "category": "Ceiling Fans",
            "allocation": round(fans_budget, 2),
            "items": [
                {
                    "name": "Havells / Atomberg BLDC Energy Saver Fan",
                    "description": "5-star rated silent decorative fan with remote control",
                    "estimated_price": fan_unit_price,
                    "quantity": num_fans,
                    "search_terms": "Atomberg Renesa BLDC Ceiling Fan 1200mm"
                }
            ]
        },
        {
            "category": "Furniture",
            "allocation": round(furniture_budget, 2),
            "items": [
                {
                    "name": "Solimo / IKEA Ergonomic Seating & Accent Tables",
                    "description": f"Durable modular living furniture designed for compact style",
                    "estimated_price": furniture_unit_price,
                    "quantity": num_furniture,
                    "search_terms": "IKEA modern wooden living room accent chair table"
                }
            ]
        },
        {
            "category": "Dining",
            "allocation": round(dining_budget, 2),
            "items": [
                {
                    "name": "Solid Sheesham Wood Dining Table",
                    "description": "Modern finish space-saving dining table with matching seating",
                    "estimated_price": dining_unit_price,
                    "quantity": num_dining,
                    "search_terms": "Solid Sheesham Wood 4 Seater Dining Table"
                }
            ]
        }
    ]
    
    total_spent = (light_unit_price * num_lights) + (fan_unit_price * num_fans) + (furniture_unit_price * num_furniture) + (dining_unit_price * num_dining)
    remaining = max(0.0, round(total_budget - total_spent, 2))
    
    calc_table = []
    for cat in breakdown:
        c_spent = sum(it["estimated_price"] * it["quantity"] for it in cat["items"])
        calc_table.append({
            "category": cat["category"],
            "items_count": sum(it["quantity"] for it in cat["items"]),
            "total_cost": round(c_spent, 2),
            "percentage_of_budget": round((c_spent / total_budget * 100), 1) if total_budget > 0 else 0
        })

    return {
        "total_budget": total_budget,
        "budget_breakdown": breakdown,
        "calculation_table": calc_table,
        "remaining_budget": remaining,
        "additional_suggestions": [
            "Opt for BLDC motors on fans to save up to 65% on electricity bills.",
            "Consider modular flat-pack furniture from IKEA for easy relocation and durability.",
            "Use warm ambient 3000K LED lights to give living spaces an inviting hotel-like feel.",
            "Look for bundle deals on Amazon and Flipkart during festive sales."
        ]
    }


# ==============================================================================
# SCENARIO 2: PARTY BUDGET RECOMMENDATIONS
# ==============================================================================
def get_party_recommendations(budget_input) -> dict:
    """Generate party planning recommendations across catering, decor, and entertainment."""
    total_budget = float(getattr(budget_input, 'total_budget', 5000))
    party_type = getattr(budget_input, 'party_type', 'Birthday') or 'Birthday'
    num_guests = int(getattr(budget_input, 'num_guests', 10))
    venue_type = getattr(budget_input, 'venue_type', 'Home') or 'Home'
    needs_catering = getattr(budget_input, 'needs_catering', True)
    needs_decoration = getattr(budget_input, 'needs_decoration', True)
    needs_entertainment = getattr(budget_input, 'needs_entertainment', True)
    additional_reqs = getattr(budget_input, 'additional_requirements', "") or "Festive and fun atmosphere"

    prompt = f"""
I need party planning recommendations for India with a total budget of ₹{total_budget:.2f}.
Party details:
- Type: {party_type}
- Number of guests: {num_guests}
- Venue type: {venue_type}
- Catering needed: {"Yes" if needs_catering else "No"}
- Decoration needed: {"Yes" if needs_decoration else "No"}
- Entertainment needed: {"Yes" if needs_entertainment else "No"}
Additional requirements: {additional_reqs}

Please provide a detailed budget breakdown with specific recommendations available in India using INR prices.
Format your response strictly as JSON with this structure:
{{
  "total_budget": {total_budget:.2f},
  "budget_breakdown": [
    {{
      "category": "Venue",
      "allocation": 0.0,
      "items": [
        {{
          "name": "Cozy Party Venue / Banquet Hall / Home Setup",
          "description": "Venue arrangement suitable for {num_guests} guests",
          "estimated_price": 0.0,
          "quantity": 1,
          "search_terms": "{venue_type} party venue in India"
        }}
      ]
    }},
    {{
      "category": "Catering",
      "allocation": 0.0,
      "items": [
        {{
          "name": "Special Party Buffet & Appetizers",
          "description": "Multi-course meal with snacks and beverages for {num_guests} people",
          "estimated_price": 0.0,
          "quantity": {num_guests},
          "search_terms": "Swiggy Zomato party catering bulk meal"
        }}
      ]
    }},
    {{
      "category": "Decoration",
      "allocation": 0.0,
      "items": [
        {{
          "name": "Theme Balloon Arch & Backdrop Kit",
          "description": "Vibrant decoration kit matching {party_type} celebration",
          "estimated_price": 0.0,
          "quantity": 1,
          "search_terms": "{party_type} DIY party decoration theme kit"
        }}
      ]
    }},
    {{
      "category": "Entertainment",
      "allocation": 0.0,
      "items": [
        {{
          "name": "Music Streaming & Party Board Games",
          "description": "Party games, karaoke or sound setup",
          "estimated_price": 0.0,
          "quantity": 1,
          "search_terms": "Bluetooth party speaker board games"
        }}
      ]
    }},
    {{
      "category": "Contingency",
      "allocation": 0.0,
      "items": [
        {{
          "name": "Emergency & Miscellaneous Buffer",
          "description": "Extra ice, disposables, and surprise expenses",
          "estimated_price": 0.0,
          "quantity": 1,
          "search_terms": "Biodegradable party plates glasses napkins"
        }}
      ]
    }}
  ],
  "venue_suggestions": [
    {{
      "name": "{venue_type} Celebration Spot",
      "type": "{venue_type}",
      "capacity": {num_guests},
      "estimated_cost": 0.0,
      "search_terms": "{venue_type} party space booking"
    }}
  ],
  "remaining_budget": 0.0,
  "additional_suggestions": [
    "Order food from cloud kitchens or bulk party menus on Swiggy/Zomato to save up to 30%.",
    "Use reusable fairy lights and DIY backdrop banners for eco-friendly aesthetics."
  ]
}}
Ensure all costs are in INR and total does not exceed the given budget.
"""

    result = None
    if model:
        try:
            response = model.generate_content(prompt)
            result = extract_json_from_response(response.text)
        except Exception as e:
            print(f"Gemini API party planner error: {e}")
            result = None

    if not result or "budget_breakdown" not in result or not result["budget_breakdown"]:
        result = _generate_fallback_party_recommendations(total_budget, party_type, num_guests, venue_type, needs_catering, needs_decoration, needs_entertainment)

    # Category platform definitions as required by milestone specifications
    category_platforms = {
        "venue": ["google", "booking", "makemytrip", "oyorooms", "nobroker"],
        "catering": ["swiggy", "zomato", "bigbasket", "amazon"],
        "food": ["swiggy", "zomato", "bigbasket", "amazon", "flipkart"],
        "drinks": ["swiggy", "zomato", "bigbasket", "amazon"],
        "decoration": ["amazon", "flipkart", "meesho", "myntra"],
        "entertainment": ["bookmyshow", "amazon", "flipkart"],
        "gifts": ["amazon", "flipkart", "myntra", "meesho"],
        "photography": ["google", "amazon", "flipkart"],
        "music": ["amazon", "flipkart", "bookmyshow"],
        "games": ["amazon", "flipkart"],
        "contingency": ["amazon", "flipkart", "bigbasket"],
        "accessories": ["amazon", "flipkart", "myntra", "meesho"],
        "transportation": ["makemytrip", "google"],
        "return_gifts": ["amazon", "flipkart", "myntra", "meesho"]
    }
    default_platforms = ["amazon", "flipkart", "google"]

    # Add shopping links for each item
    for category in result.get("budget_breakdown", []):
        cat_name = category.get("category", "").lower()
        rel_platforms = category_platforms.get(cat_name, default_platforms)
        for item in category.get("items", []):
            search_terms = item.get("search_terms") or item.get("name", "party supplies")
            encoded_query = urllib.parse.quote_plus(search_terms)
            
            item_links = {}
            if "amazon" in rel_platforms:
                item_links["amazon"] = f"https://www.amazon.in/s?k={encoded_query}"
            if "flipkart" in rel_platforms:
                item_links["flipkart"] = f"https://www.flipkart.com/search?q={encoded_query}"
            if "bigbasket" in rel_platforms:
                item_links["bigbasket"] = f"https://www.bigbasket.com/ps/?q={encoded_query}"
            if "swiggy" in rel_platforms:
                item_links["swiggy"] = f"https://www.swiggy.com/search?query={encoded_query}"
            if "zomato" in rel_platforms:
                item_links["zomato"] = f"https://www.zomato.com/search?q={encoded_query}"
            if "bookmyshow" in rel_platforms:
                item_links["bookmyshow"] = f"https://in.bookmyshow.com/explore/events"
            if "myntra" in rel_platforms:
                item_links["myntra"] = f"https://www.myntra.com/{encoded_query}"
            if "meesho" in rel_platforms:
                item_links["meesho"] = f"https://www.meesho.com/search?q={encoded_query}"
            if "google" in rel_platforms:
                item_links["google"] = f"https://www.google.com/search?q={encoded_query}"
            if "booking" in rel_platforms:
                item_links["booking"] = f"https://www.booking.com/search.html?ss={encoded_query}"
            if "makemytrip" in rel_platforms:
                item_links["makemytrip"] = f"https://www.makemytrip.com/hotels/hotel-listing/?searchText={encoded_query}"
            if "oyorooms" in rel_platforms:
                item_links["oyorooms"] = f"https://www.oyorooms.com/search/?location={encoded_query}"
            if "nobroker" in rel_platforms:
                item_links["nobroker"] = f"https://www.nobroker.in/property/search?searchTerm={encoded_query}"
                
            item["shopping_links"] = item_links

    # Add search links for venue suggestions
    for venue in result.get("venue_suggestions", []):
        v_terms = venue.get("search_terms") or venue.get("name", "Party hall")
        v_encoded = urllib.parse.quote_plus(v_terms)
        venue["search_links"] = {
            "google": f"https://www.google.com/search?q={v_encoded}",
            "booking": f"https://www.booking.com/search.html?ss={v_encoded}",
            "makemytrip": f"https://www.makemytrip.com/hotels/hotel-listing/?searchText={v_encoded}",
            "oyorooms": f"https://www.oyorooms.com/search/?location={v_encoded}",
            "nobroker": f"https://www.nobroker.in/property/search?searchTerm={v_encoded}"
        }

    # Generate calculation_table_inr
    calc_table = []
    for cat in result.get("budget_breakdown", []):
        cat_name = cat.get("category", "Misc")
        items = cat.get("items", [])
        cat_total = sum(float(it.get("estimated_price", 0)) * int(it.get("quantity", 1)) for it in items)
        pct = round((cat_total / total_budget * 100), 1) if total_budget > 0 else 0
        calc_table.append({
            "category": cat_name,
            "items_count": sum(int(it.get("quantity", 1)) for it in items),
            "total_cost": round(cat_total, 2),
            "percentage_of_budget": pct
        })
    result["calculation_table_inr"] = calc_table

    return result


def _generate_fallback_party_recommendations(total_budget, party_type, num_guests, venue_type, catering, decoration, entertainment):
    """Accurate offline calculation engine for Party Budget Planner."""
    allocations = {
        "Venue": 0.20 if venue_type.lower() != "home" else 0.05,
        "Catering": 0.45 if catering else 0.10,
        "Decoration": 0.15 if decoration else 0.05,
        "Entertainment": 0.15 if entertainment else 0.05,
        "Contingency": 0.05
    }
    # Normalize allocations
    tot_weight = sum(allocations.values())
    for k in allocations:
        allocations[k] = allocations[k] / tot_weight

    venue_cost = round(total_budget * allocations["Venue"], 2)
    catering_cost = round(total_budget * allocations["Catering"], 2)
    decor_cost = round(total_budget * allocations["Decoration"], 2)
    ent_cost = round(total_budget * allocations["Entertainment"], 2)
    contingency_cost = round(total_budget * allocations["Contingency"], 2)

    per_guest_food = round(catering_cost / max(num_guests, 1), 2)

    breakdown = [
        {
            "category": "Venue",
            "allocation": venue_cost,
            "items": [
                {
                    "name": f"{venue_type} Booking & Setup",
                    "description": f"Arrangement and cleaning for {num_guests} guests",
                    "estimated_price": venue_cost,
                    "quantity": 1,
                    "search_terms": f"{venue_type} party venue booking"
                }
            ]
        },
        {
            "category": "Catering",
            "allocation": catering_cost,
            "items": [
                {
                    "name": "Party Meals & Starter Combo",
                    "description": f"Curated appetizers, main course and beverages for {num_guests} guests",
                    "estimated_price": per_guest_food,
                    "quantity": num_guests,
                    "search_terms": "Swiggy Zomato bulk party platter order"
                }
            ]
        },
        {
            "category": "Decoration",
            "allocation": decor_cost,
            "items": [
                {
                    "name": f"{party_type} Theme Backdrop & Fairy Lights",
                    "description": "High quality balloon arch kit with celebration banner",
                    "estimated_price": decor_cost,
                    "quantity": 1,
                    "search_terms": f"{party_type} theme decoration kit with lights"
                }
            ]
        },
        {
            "category": "Entertainment",
            "allocation": ent_cost,
            "items": [
                {
                    "name": "Party Speaker / Interactive Games",
                    "description": "Portable bluetooth audio setup and trivia board game bundle",
                    "estimated_price": ent_cost,
                    "quantity": 1,
                    "search_terms": "Party bluetooth speaker card board games"
                }
            ]
        },
        {
            "category": "Contingency",
            "allocation": contingency_cost,
            "items": [
                {
                    "name": "Cutlery, Ice & Surprise Buffer",
                    "description": "Eco-friendly disposable tableware and emergency fund",
                    "estimated_price": contingency_cost,
                    "quantity": 1,
                    "search_terms": "Eco friendly party disposable plates cups"
                }
            ]
        }
    ]

    total_spent = venue_cost + (per_guest_food * num_guests) + decor_cost + ent_cost + contingency_cost
    remaining = max(0.0, round(total_budget - total_spent, 2))

    return {
        "total_budget": total_budget,
        "budget_breakdown": breakdown,
        "venue_suggestions": [
            {
                "name": f"Local {venue_type} & Banquet Spaces",
                "type": venue_type,
                "capacity": num_guests,
                "estimated_cost": venue_cost,
                "search_terms": f"{venue_type} event space in city"
            }
        ],
        "remaining_budget": remaining,
        "additional_suggestions": [
            "Opt for buffet or potluck arrangements to keep food costs predictable.",
            "Use customized digital invitations to eliminate printing costs.",
            "Utilize festive Spotify or YouTube playlists to avoid separate DJ charges.",
            "Prepare a 10% cash contingency for sudden beverage or snack restocks."
        ]
    }


# ==============================================================================
# SCENARIO 3: JEWELRY BUDGET RECOMMENDATIONS (MULTIMODAL)
# ==============================================================================
def get_jewelry_recommendations(budget_input, image_path: Optional[str] = None) -> dict:
    """Generate jewelry recommendations based on occasion, style, and optional outfit image."""
    total_budget = float(getattr(budget_input, 'total_budget', 5000))
    occasion = getattr(budget_input, 'occasion', 'Wedding') or 'Wedding'
    preferences = getattr(budget_input, 'preferences', 'Gold / Elegant') or 'Elegant & Timeless'

    base_prompt = f"""
I need jewelry recommendations for India with a total budget of ₹{total_budget:.2f}.
Occasion: {occasion}
Preferences: {preferences}
Provide only India-relevant styles, availability, and price ranges in INR.
"""

    result = None
    if model:
        try:
            if image_path and os.path.exists(image_path) and Image:
                img = Image.open(image_path)
                multimodal_prompt = base_prompt + """
An image of the outfit is uploaded. Suggest jewelry that complements it, considering color, design, and occasion appropriateness.

Format the output strictly as valid JSON:
{
  "outfit_analysis": {
    "colors": ["Detected Primary Color", "Accent Color"],
    "style": "Traditional / Western / Indo-Western",
    "formality": "Formal / Festive / Casual"
  },
  "total_budget": """ + f"{total_budget:.2f}" + """,
  "jewelry_recommendations": [
    {
      "item_type": "Necklace / Choker",
      "name": "Kundan Choker / Minimalist Pendant",
      "description": "Complements the neckline and tones of the outfit",
      "style": "Contemporary Gold / Silver Polish",
      "estimated_price": 0.0,
      "search_terms": "Tanishq Caratlane gold necklace choker"
    },
    {
      "item_type": "Earrings",
      "name": "Jhumkas / Statement Studs",
      "description": "Matches the embroidery and neckline elegance",
      "style": "Traditional / Minimal",
      "estimated_price": 0.0,
      "search_terms": "Caratlane diamond earrings studs"
    },
    {
      "item_type": "Bracelet / Bangles",
      "name": "Sleek Kada / Charm Bracelet",
      "description": "Subtle wrist accessory that balances the overall look",
      "style": "Classic",
      "estimated_price": 0.0,
      "search_terms": "BlueStone gold bracelet kada"
    },
    {
      "item_type": "Ring",
      "name": "Solitaire / Cocktail Ring",
      "description": "Adds a refined touch to hands",
      "style": "Minimalist",
      "estimated_price": 0.0,
      "search_terms": "GIVA Silver Solitaire Adjustable Ring"
    }
  ],
  "remaining_budget": 0.0,
  "styling_tips": [
    "Balance heavy neckpieces with lighter earrings.",
    "Match metal tones (warm gold vs cool silver) with the outfit's zari/threadwork."
  ]
}
"""
                response = model.generate_content([multimodal_prompt, img])
            else:
                text_prompt = base_prompt + """
Format the output strictly as valid JSON:
{
  "outfit_analysis": {
    "colors": ["Neutral", "Metallic"],
    "style": "Classic Occasion Wear",
    "formality": "Semi-formal / Festive"
  },
  "total_budget": """ + f"{total_budget:.2f}" + """,
  "jewelry_recommendations": [
    {
      "item_type": "Necklace",
      "name": "Festive Gold Plated Layered Necklace",
      "description": "Stunning focal piece for the occasion",
      "style": "Traditional / Elegant",
      "estimated_price": 0.0,
      "search_terms": "Tanishq gold layered necklace"
    },
    {
      "item_type": "Earrings",
      "name": "Designer Drop Earrings",
      "description": "Refined earrings that highlight facial features",
      "style": "Floral / Classic",
      "estimated_price": 0.0,
      "search_terms": "Caratlane gold drop earrings"
    },
    {
      "item_type": "Ring",
      "name": "Solitaire Accent Ring",
      "description": "Sophisticated ring suitable for everyday and party wear",
      "style": "Minimalist",
      "estimated_price": 0.0,
      "search_terms": "BlueStone 18kt gold solitaire ring"
    },
    {
      "item_type": "Bracelet",
      "name": "Delicate Chain Bracelet",
      "description": "Lightweight bracelet offering subtle shimmer",
      "style": "Modern",
      "estimated_price": 0.0,
      "search_terms": "Melorra diamond lightweight bracelet"
    }
  ],
  "remaining_budget": 0.0,
  "styling_tips": [
    "Coordinate the metal hues with your footwear and bag hardware.",
    "Less is more: let one statement jewelry item take center stage."
  ]
}
"""
                response = model.generate_content(text_prompt)
            result = extract_json_from_response(response.text)
        except Exception as e:
            print(f"Gemini API jewelry planner error: {e}")
            result = None

    if not result or "jewelry_recommendations" not in result or not result["jewelry_recommendations"]:
        result = _generate_fallback_jewelry_recommendations(total_budget, occasion, preferences, bool(image_path))

    # Add shopping links for each jewelry item as required by specifications
    for item in result.get("jewelry_recommendations", []):
        search_terms = item.get("search_terms") or item.get("name", "Jewelry")
        encoded_query = urllib.parse.quote_plus(search_terms)
        item["shopping_links"] = {
            "amazon": f"https://www.amazon.in/s?k={encoded_query}",
            "flipkart": f"https://www.flipkart.com/search?q={encoded_query}",
            "bluestone": f"https://www.bluestone.com/search.html?query={encoded_query}",
            "tanishq": f"https://www.tanishq.co.in/search?q={encoded_query}",
            "caratlane": f"https://www.caratlane.com/search?q={encoded_query}",
            "melorra": f"https://www.melorra.com/search?q={encoded_query}",
            "meesho": f"https://www.meesho.com/search?q={encoded_query}"
        }

    return result


def _generate_fallback_jewelry_recommendations(total_budget, occasion, preferences, has_image=False):
    """Accurate offline calculation engine for Jewelry Planner."""
    necklace_cost = round(total_budget * 0.40, 2)
    earrings_cost = round(total_budget * 0.25, 2)
    bracelet_cost = round(total_budget * 0.20, 2)
    ring_cost = round(total_budget * 0.10, 2)
    remaining = max(0.0, round(total_budget - (necklace_cost + earrings_cost + bracelet_cost + ring_cost), 2))

    return {
        "outfit_analysis": {
            "colors": ["Royal Crimson", "Gold / Zari accents"] if has_image else ["Classic Festive Hues"],
            "style": f"Elegant {occasion} Attire",
            "formality": "Festive / Celebration"
        },
        "total_budget": total_budget,
        "jewelry_recommendations": [
            {
                "item_type": "Necklace",
                "name": "Heritage Gold Plated Choker / Pendant Set",
                "description": f"Graceful neckpiece tailored to elevate your {occasion} look",
                "style": preferences,
                "estimated_price": necklace_cost,
                "search_terms": f"Tanishq gold necklace {occasion}"
            },
            {
                "item_type": "Earrings",
                "name": "Classic Chandbali / Stud Earrings",
                "description": "Sparkling earrings harmonized with neckline embroidery",
                "style": "Timeless",
                "estimated_price": earrings_cost,
                "search_terms": "CaratLane gold earrings jhumka"
            },
            {
                "item_type": "Bracelet",
                "name": "Sleek Kada / Charm Bracelet",
                "description": "Subtle wrist sparkle that complements outfit cuffs",
                "style": "Contemporary",
                "estimated_price": bracelet_cost,
                "search_terms": "BlueStone gold cuff bracelet"
            },
            {
                "item_type": "Ring",
                "name": "Solitaire Adjustable Statement Ring",
                "description": "Refined accent piece for hands",
                "style": "Minimalist",
                "estimated_price": ring_cost,
                "search_terms": "GIVA sterling silver solitaire ring"
            }
        ],
        "remaining_budget": remaining,
        "styling_tips": [
            "Pair open necklines with a statement choker and petite studs.",
            "Choose 925 sterling silver or 18kt gold vermeil for high luster without exceeding your budget.",
            "Ensure metal tones match the hardware on your purse and shoes for a cohesive look.",
            "Store delicate jewelry in airtight pouches with silica gel to prevent oxidation."
        ]
    }
