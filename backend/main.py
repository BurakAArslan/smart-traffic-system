from fastapi import FastAPI, Depends, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import unicodedata
from src.services.llm_chat_service import (
    generate_llm_chat
)
from src.services.route_analysis_service import analyze_routes
from src.auth.auth_router import router as auth_router
from src.auth.security import get_current_user
from src.database.connection import get_db
from src.database.connection import engine
from src.database.base import Base
from src.database.models.user import User
from src.database.models.route_history import RouteHistory

from fastapi import UploadFile, File
import os
import shutil
from typing import List, Dict, Any


app = FastAPI(title="Smart Traffic System API")
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)
from src.api.chatbot import router as chatbot_router
app.include_router(chatbot_router)

# Tabloları oluştur
Base.metadata.create_all(bind=engine)

# Authentication router
app.include_router(auth_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RouteRequest(BaseModel):
    start: str | None = None
    end: str
    start_lat: float | None = None
    start_lon: float | None = None


class ChatRequest(BaseModel):
    

    message: str
    language: str = "tr"

    history: List[Dict[str, Any]] = []

    route_data: List[Dict[str, Any]] | None = None

class AvatarRequest(BaseModel):
    avatar: str

@app.get("/")
def root():
    return {"message": "Smart Traffic System API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/profile/upload-photo")
def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    os.makedirs("uploads", exist_ok=True)

    file_extension = file.filename.split(".")[-1]

    file_name = (
        f"user_{current_user.id}.{file_extension}"
    )

    file_path = f"uploads/{file_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    current_user.profile_image = file_path

    db.commit()

    return {
        "message": "Fotoğraf yüklendi",
        "image_url": f"/uploads/{file_name}"

    }
@app.post("/profile/select-avatar")
def select_avatar(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    avatar = data.get("avatar")

    current_user.profile_image = avatar

    db.commit()
    print("SAVED AVATAR:", current_user.profile_image)

    return {
        "message": "Avatar updated",
        "profile_image": avatar
    }


@app.post("/profile/remove-photo")
def remove_photo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    current_user.profile_image = None

    db.commit()

    return {
        "message": "Photo removed"
    }
@app.post("/route/analyze")
def analyze_route(
    req: RouteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Türkçe karakter normalize
    safe_origin = unicodedata.normalize(
        "NFC",
        req.start or "Mevcut Konum"
    )

    safe_destination = unicodedata.normalize(
        "NFC",
        req.end
    )

    # Rota analizi yap
    result = analyze_routes(
        start=safe_origin,
        end=safe_destination,
        start_lat=req.start_lat,
        start_lon=req.start_lon
        
    )
    
    if result is None:
        return {
            "error": "Route analysis failed."
        }

    # Rotaları kaydet
    if "all_routes" in result and len(result["all_routes"]) > 0:

        best_route = result["all_routes"][0]

        new_record = RouteHistory(
            user_id=current_user.id,

            origin=safe_origin,

            destination=safe_destination,

            route_type=best_route.get(
                "route_type", "FAST"
            ),

            distance_km=best_route.get(
                "distance_km", 0
            ),

            duration_min=best_route.get(
                "estimated_time_min", 0
            ),

            traffic_level=best_route.get(
                "traffic_level", "unknown"
            ),

            weather_risk=str(
                best_route.get(
                    "weather_risk", "unknown"
                )
            ),

            explanation=best_route.get(
                "explanation", ""
            )
        )

        db.add(new_record)
        db.commit()

    return result


@app.get("/routes/history")
def get_route_history(
    page: int = Query(1, ge=1),

    current_user: User = Depends(get_current_user),

    db: Session = Depends(get_db)
):
    PER_PAGE = 5

    offset = (page - 1) * PER_PAGE

    total_routes = (
        db.query(RouteHistory)
        .filter(RouteHistory.user_id == current_user.id)
        .count()
    )

    routes = (
        db.query(RouteHistory)
        .filter(RouteHistory.user_id == current_user.id)
        .order_by(RouteHistory.created_at.desc())
        .offset(offset)
        .limit(PER_PAGE)
        .all()
    )

    result = []

    for route in routes:
        result.append({
            "id": route.id,
            "origin": route.origin,
            "destination": route.destination,
            "route_type": route.route_type,
            "distance_km": route.distance_km,
            "duration_min": route.duration_min,
            "traffic_level": route.traffic_level,
            "weather_risk": route.weather_risk,
            "explanation": route.explanation,
            "created_at": route.created_at
        })

    return {
        "page": page,
        "per_page": PER_PAGE,
        "total_routes": total_routes,
        "total_pages": (
            (total_routes + PER_PAGE - 1) // PER_PAGE
        ),
        "routes": result
    }

from src.rag.rag_service import retrieve_rag_context

@app.get("/profile")
def get_profile(
    current_user: User = Depends(get_current_user)
):

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "profile_image": current_user.profile_image,
    }

@app.post("/assistant/chat")
def assistant_chat(
    req: ChatRequest,
    current_user: User = Depends(get_current_user)
):

    try:

        routes = req.route_data or []
        message = (req.message or "").lower().strip()
        message_lower = message
        
        history = req.history or []
        language = req.language

        rag_query = message

        if "sis" in message:
            rag_query = (
                "Sisli havada güvenli sürüş, görüş mesafesi, "
                "kısa far kullanımı ve hız azaltma"
            )

        elif "yağmur" in message or "yağış" in message:
            rag_query = (
                "Yağmurlu havada güvenli sürüş, takip mesafesi, "
                "ani fren yapmama ve hız azaltma"
            )

        elif "buz" in message or "buzlanma" in message:
            rag_query = (
                "Buzlanma riskinde güvenli sürüş, ani fren yapmama, "
                "hız düşürme ve takip mesafesi"
            )

        elif "kaza" in message:
            rag_query = (
                "Kaza anında yapılması gerekenler, güvenlik, "
                "112 acil ve araç güvenli bölgeye alma"
            )

       
        
        

        # ------------------------------------------------
        # HELPERS
        # ------------------------------------------------

        def route_name(route):

            return str(
                route.get(
                    "route_name",
                    "Rota"
                )
            ).replace("Route", "Rota")

        def get_duration(route):

            try:
                return float(
                    route.get(
                        "estimated_time_min",
                        9999
                    ) or 9999
                )
            except:
                return 9999

        def get_distance(route):

            try:
                return float(
                    route.get(
                        "distance_km",
                        9999
                    ) or 9999
                )
            except:
                return 9999

        def get_risk(route):

            try:
                return float(
                    route.get(
                        "risk_score",
                        9999
                    ) or 9999
                )
            except:
                return 9999

        def get_incident_count(route):

            try:
                return int(
                    route.get(
                        "incident_count",
                        0
                    ) or 0
                )
            except:
                return 0

        def traffic_value(level):

            level = str(level).lower()

            order = {
                "low": 1,
                "medium": 2,
                "high": 3,
                "düşük": 1,
                "orta": 2,
                "yüksek": 3
            }

            return order.get(level, 2)

        def traffic_text(level):

            val = traffic_value(level)

            if val == 1:
                return "düşük"

            if val == 2:
                return "orta"

            return "yüksek"

        

        # ------------------------------------------------
        # GLOBAL ANALYSIS
        # ------------------------------------------------

       

        if routes:

            worst_traffic_route = max(
                routes,
                key=lambda r: traffic_value(
                    r.get(
                        "traffic_level",
                        "low"
                    )
                )
            )

           

        else:

            worst_traffic_route = {
                "traffic_level": "low"
            }

            total_incidents = 0

        total_incidents = sum(
            get_incident_count(r)
            for r in routes
        )
        # ------------------------------------------------
        # MEMORY CONTEXT
        # ------------------------------------------------

        if (
            "o zaman" in message
            or "peki" in message
            or "böyle olursa" in message
        ):

            if history:
                print("HISTORY:", history)

                last_topics = []

                for item in history[-4:]:

                    content = (
                        item.get("content", "")
                        .lower()
                    )

                    if (
                        "sis" in content
                        or "görüş" in content
                        or "fog" in content
                    ):
                        last_topics.append("sis")

                    if (
                        "yağmur" in content
                        or "yağış" in content
                        or "rain" in content
                    ):
                        last_topics.append("yağmur")

                    if (
                        "buz" in content
                        or "buzlanma" in content
                        or "ice" in content
                    ):
                        last_topics.append("buzlanma")

                    if "kar" in content:
                        last_topics.append("kar")

                if "sis" in last_topics:

                    return {
                        "answer": (
                            "Sisli havalarda hız düşürülmeli "
                            "ve takip mesafesi artırılmalıdır."
                        )
                    }

                if "yağmur" in last_topics:

                    return {
                        "answer": (
                            "Yağışlı havalarda ani fren "
                            "ve sert manevralardan kaçınılmalıdır."
                        )
                    }

                if "buzlanma" in last_topics:

                    return {
                        "answer": (
                            "Buzlanma durumunda düşük hız "
                            "ve dikkatli frenleme önerilir."
                        )
                    }
        # ------------------------------------------------
        # WEATHER ALERTS
        # ------------------------------------------------

        weather_alerts = []

        for route in routes:

            alerts = route.get(
                "weather_alerts",
                []
            ) or []

            for alert in alerts:

                if alert not in weather_alerts:
                    weather_alerts.append(alert)

    
        # ------------------------------------------------
        # AI ROUTER
        # ------------------------------------------------

        message_lower = message

        intent = "general"

        # REALTIME WEATHER
        if any(x in message_lower for x in [

            "şu an hava",
            "hava durumu",
            "sis var mı",
            "yağmur var mı",
            "kar var mı",
            "buzlanma var mı",

        ]):

            intent = "realtime_weather"

        # REALTIME TRAFFIC
        elif any(x in message_lower for x in [

            "trafik nasıl",
            "trafik yoğun mu",
            "yoğunluk",
            "trafik durumu",
            "kaza var mı",
            

        ]):

            intent = "realtime_traffic"

        # ROUTE DECISION
        elif any(x in message_lower for x in [

            "hangi rota",
            "hangi yolu",
            "hangisini seç",
            "en iyi rota",
            "en kısa rota",
            "en kısa yol",
            "kısa rota",
            "hangi rota daha kısa",
            "en hızlı yol",
            "hangi yol daha kısa",
            "en uzun rota",
            "en hızlı rota",
            "en güvenli rota",
            "en kısa süre"
            "en az riskli rota",
            "en uzun yol",
            "uzun rota",
            "hangi rota daha uzun",
            "hangi yol daha uzun",

        ]):

            intent = "route_decision"

        # REASONING
        elif any(x in message_lower for x in [

            "mantıklı mı",
            "sence",
            "riskli mi",
            "önerir misin",
            "ne düşünüyorsun",

        ]):

            intent = "reasoning"

        # DRIVING KNOWLEDGE
        elif any(x in message_lower for x in [

            "nasıl sürülmeli",
            "takip mesafesi",
            "güvenli sürüş",
            "ne yapılmalı",

        ]):

            intent = "driving_knowledge"

        print("AI INTENT:", intent)
        # ------------------------------------------------
        # ROUTE DECISION ENGINE
        # ------------------------------------------------

        if intent == "route_decision" and routes:

            # EN KISA MESAFE
            if (
                "en kısa" in message_lower
                or "kısa rota" in message_lower
                or "hangi rota daha kısa" in message_lower
                or "hangi yol daha kısa" in message_lower
            ):

                shortest_route = min(
                    routes,
                    key=lambda r: get_distance(r)
                )

                return {
                    "answer":
                    f"En kısa rota {route_name(shortest_route)}. "
                    f"Mesafesi {shortest_route.get('distance_km')} km."
                }

            # EN HIZLI
            if (
                "en hızlı" in message_lower
                or "en kısa süre" in message_lower
                or "hangi rota daha hızlı" in message_lower
            ):

                fastest_route = min(
                    routes,
                    key=lambda r: get_duration(r)
                )

                return {
                    "answer":
                    f"En hızlı rota {route_name(fastest_route)}. "
                    f"Tahmini süre {fastest_route.get('estimated_time_min')} dakika."
                }

            # EN GÜVENLİ
            if (
                "en güvenli" in message_lower
                or "en az risk" in message_lower
                or "güvenli rota" in message_lower
            ):

                safest_route = min(
                    routes,
                    key=lambda r: get_risk(r)
                )

                return {
                    "answer":
                    f"En güvenli rota {route_name(safest_route)}. "
                    f"Risk seviyesi {safest_route.get('risk_level')}."
                }

        need_rag = (
            intent in [
                "driving_knowledge",
                "realtime_weather",
                "reasoning",
                "realtime_traffic",
                "route_decision",
            ]
            or any(x in message_lower for x in [
                "sis",
                "yağmur",
                "kar",
                "buz",
                "takip",
                "güvenli",
                "sürüş",
                "hava",
                "trafik",
                "fren",
                "hız",
                "ceza",
                "risk",
                "görüş",
                "dikkat",
            ])
        )

        rag_contexts = []

        if need_rag:
            rag_contexts = retrieve_rag_context(
                rag_query,
                top_k=3
            )

        rag_text = ""

        if rag_contexts:
            rag_sentences = []

            for ctx in rag_contexts:
                text = ctx["text"]
                sentences = text.split(".")

                for sentence in sentences:
                    sentence = sentence.strip()

                    if len(sentence) < 25:
                        continue

                    if sentence in rag_sentences:
                        continue

                    rag_sentences.append(sentence)

            rag_text = ". ".join(
                rag_sentences[:4]
            )

            if rag_text:
                rag_text += "."

        print("RAG CONTEXT:", rag_text)

        # ------------------------------------------------
        # REALTIME WEATHER ENGINE
        # ------------------------------------------------

        if intent == "realtime_weather":

            # SIS SORUSU
            if "sis" in message:

                if "FOG" in weather_alerts:

                    return {
                        "answer": (
                            "Rota üzerinde sis ve düşük "
                            "görüş riski bulunuyor."
                        )
                    }

                return {
                    "answer": (
                        "Şu an rota üzerinde belirgin "
                        "bir sis riski görünmüyor."
                    )
                }

            # YAĞMUR SORUSU
            if "yağmur" in message or "yağış" in message:

                if "HEAVY_RAIN" in weather_alerts:

                    return {
                        "answer": (
                            "Rota üzerinde yoğun yağış "
                            "görünüyor."
                        )
                    }

                return {
                    "answer": (
                        "Şu an rota üzerinde ciddi "
                        "bir yağış görünmüyor."
                    )
                }

            # KAR SORUSU
            if "kar" in message:

                if "SNOW" in weather_alerts:

                    return {
                        "answer": (
                            "Rota üzerinde kar riski bulunuyor."
                        )
                    }

                return {
                    "answer": (
                        "Şu an rota üzerinde kar riski görünmüyor."
                    )
                }

            # BUZLANMA SORUSU
            if "buz" in message:

                if "ICE" in weather_alerts:

                    return {
                        "answer": (
                            "Rota üzerinde buzlanma riski bulunuyor."
                        )
                    }

                return {
                    "answer": (
                        "Şu an rota üzerinde buzlanma görünmüyor."
                    )
                }

            return {
                "answer": (
                    "Şu an rota üzerinde ciddi "
                    "bir hava riski görünmüyor."
                )
            }
        # ------------------------------------------------
        # REALTIME TRAFFIC ENGINE
        # ------------------------------------------------

        if intent == "realtime_traffic":

            level = traffic_text(
                worst_traffic_route.get(
                    "traffic_level",
                    "low"
                )
            )

            if total_incidents > 5:

                return {
                    "answer": (
                        "Bazı rota seçeneklerinde "
                        "yoğun trafik olayları bulunuyor."
                    )
                }

            if level == "yüksek":

                return {
                    "answer": (
                        "Trafik yoğun görünüyor."
                    )
                }

            if level == "orta":

                return {
                    "answer": (
                        "Trafik orta seviyede."
                    )
                }

            return {
                "answer": (
                    "Trafik genel olarak akıcı görünüyor."
                )
            }

       
        # ------------------------------------------------
        # RULE-BASED SAFETY ENGINE
        # ------------------------------------------------

        # TAKIP MESAFESI
        if "takip mesafesi" in message_lower:

            import re

            numbers = re.findall(r"\d+", message_lower)

            if numbers:

                speed = int(numbers[0])

                safe_distance = round(speed / 2)

                return {
                    "answer": (
                        f"{speed} km/h hızda minimum "
                        f"{safe_distance} metre takip "
                        f"mesafesi önerilir."
                    )
                }

            return {
                "answer": (
                    "Takip mesafesi hız arttıkça "
                    "artırılmalıdır. Güvenli sürüş için "
                    "en az 2 saniye kuralı önerilir."
                )
            }

        # HIZ RISKI
        if "çok hızlı" in message_lower or "yüksek hız" in message_lower:

            return {
                "answer": (
                    "Yüksek hız hem fren mesafesini "
                    "artırır hem de kaza riskini yükseltir."
                )
            }

        # SIS
        if "sisli havada" in message_lower:

            return {
                "answer": (
                    "Sisli havalarda hız düşürülmeli "
                    "ve takip mesafesi artırılmalıdır."
                )
            }

        # BUZLANMA
        if "buzlanma" in message_lower:

            return {
                "answer": (
                    "Buzlanma durumunda ani fren "
                    "ve sert manevralardan kaçınılmalıdır."
                )
            }

        # YAĞMUR
        if "yağmurlu havada" in message_lower:

            return {
                "answer": (
                    "Yağışlı havalarda takip mesafesi "
                    "artırılmalı ve ani fren yapılmamalıdır."
                )
            }
        # ------------------------------------------------
        # LLM CHAT
        # ------------------------------------------------

        conversation_text = ""

        for item in history[-3:]:

            role = item.get("role", "user")
            content = item.get("content", "")

            conversation_text += (
                f"{role}: {content}\n"
            )

        routes_summary = ""

        if routes:

            for route in routes:

                risk = route.get("risk_score", 0)

                if risk < 35:
                    risk_text_value = "düşük"

                elif risk < 65:
                    risk_text_value = "orta"

                else:
                    risk_text_value = "yüksek"

                routes_summary += (
                    f"""
                    {route.get("route_name")}

                    Süre:
                    {route.get("estimated_time_min")} dk

                    Mesafe:
                    {route.get("distance_km")} km

                    Trafik:
                    {route.get("traffic_level")}

                    Risk seviyesi:
                    {risk_text_value}
                    """
                )

        else:

            routes_summary = (
                "Henüz rota oluşturulmadı."
            )

        # ------------------------------------------------
        # PROMPT ROUTING
        # ------------------------------------------------


        # ROUTE DECISION PROMPT
        if any(x in message_lower for x in [

            "hangi rota",
            "hangi yolu",
            "hangi rotayı",
            "rota seç",
            "hangisini seçeyim",
            "en iyi rota",
            "en güvenli rota",
            "en hızlı rota",
            "en kısa rota",
            "en kısa yol",
            "kısa rota",
            "hangi rota daha kısa",
            "en hızlı yol",
            "en az riskli rota",
            "hangi yol daha kısa",
            "en hızlı rota",
            "en güvenli rota",
            "en kısa süre"
            "en uzun rota",
            "en uzun yol",
            "uzun rota",
            "hangi rota daha uzun",
            "hangi yol daha uzun",

        ]):

            system_prompt = """
            Sen gelişmiş akıllı trafik ve rota uzmanısın.

            Kullanıcıya:
            - trafik yoğunluğu
            - güvenlik
            - hava koşulları
            - sürüş riski
            - süre
            - rota uygunluğu

            konularında doğal ve profesyonel öneriler ver.

            Öncelikle verilen RAG bilgisini kullan.

            Asla:
            - ham teknik veri listeleme
            - anlamsız sayı verme
            - tüm rotaları uzun uzun yazma
            - uydurma bilgi üretme

            Kısa, net ve kullanıcı dostu konuş.

            Maksimum 2-3 cümle kullan.
            """

        # SAFETY / DRIVING PROMPT
        elif any(x in message_lower for x in [

            "riskli",
            "güvenli",
            "sürüş",
            "takip mesafesi",
            "gece sürüşü",
            "yağmur",
            "sis",
            "kar",
            "buz",
            "telefon",
            "dikkat",
            "yorgun",
            "hız",
            "fren",

        ]):

            system_prompt = """
            Sen profesyonel trafik güvenliği ve güvenli sürüş uzmanısın.

            Kullanıcıya:
            - gece sürüşü
            - dikkat dağınıklığı
            - hava koşulları
            - takip mesafesi
            - güvenli hız
            - savunmacı sürüş
            - buzlanma
            - yağmur
            - sis
            - trafik güvenliği

            konularında yardımcı ol.

            Öncelikle verilen RAG bilgisini kullan.

            Asla:
            - uydurma bilgi verme
            - gereksiz teknik veri listeleme
            - kullanıcı istemeden rota önerme
            - ham veri dump etme

            Kısa, doğal ve uzman gibi konuş.

            Maksimum 2-3 cümle kullan.
            """

        # GENERAL CHAT PROMPT
        else:

            system_prompt = """
            Sen gelişmiş yapay zeka trafik asistanısın.

            Kullanıcıyla doğal konuş.

            Trafik, güvenli sürüş, hava koşulları ve rota konularında yardımcı ol.

            Öncelikle verilen RAG bilgisini kullan.

            Asla:
            - uydurma bilgi verme
            - gereksiz uzun cevap verme
            - ham teknik veri listeleme
            - anlamsız risk skorları üretme

            Kısa ve kullanıcı dostu konuş.

            Maksimum 2-3 cümle kullan.
            """
        
   

        # ------------------------------------------------
        # FINAL PROMPT
        # ------------------------------------------------

        # ------------------------------------------------
        # CONTEXT FILTERING
        # ------------------------------------------------

        filtered_routes = ""
        filtered_rag = rag_text

        # Route sorularında rota verisini kullan
        if intent == "route_decision":

            filtered_routes = routes_summary

        # Realtime sorularda route verisini azalt
        elif intent in [

            "realtime_weather",
            "realtime_traffic"

        ]:

            filtered_routes = (
                "Sadece mevcut rota koşullarını yorumla."
            )

        # Genel reasoning sorularında route verisini kullanma
        else:

            filtered_routes = ""

        # ------------------------------------------------
        # FINAL PROMPT
        # ------------------------------------------------

        full_prompt = f"""
        SYSTEM:
        Cevap dili:
        {"English" if language == "en" else "Turkish"}

        {system_prompt}

        Intent:
        {intent}

        Kurallar:

        - Maksimum 2 cümle kullan.
        - Kısa cevap ver.
        - Ham teknik veri verme.
        - Risk skorlarını sayı olarak söyleme.
        - Kullanıcı sormadıysa rota listeleme.
        - Doğal konuş.
        - Güvenlik ve sürüş sorularında öncelikle verilen RAG bilgisini kullan.
        - RAG bilgisindeki güvenlik kurallarına aykırı cevap verme.
        - Emin değilsen tahmin üretme.

        Önceki konuşmalar:
        {conversation_text}

        Context:
        {filtered_routes}

        

        RAG:
        {filtered_rag}

        Kullanıcı mesajı:
        {message}

        Cevap:
        """

        llm_answer = generate_llm_chat(
        full_prompt
    )

        return {
            "answer": llm_answer
        }
        

    except Exception as e:

        print("ASSISTANT ERROR:", e)

        return {
            "answer": (
                "AI trafik asistanı "
                "şu an cevap üretemedi."
            )
        }