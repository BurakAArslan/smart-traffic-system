from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed
)

from src.api.tomtom_geocoding import geocode_place
from src.routing.tomtom_routing_service import get_tomtom_routes
from src.data.load_weather import load_weather_data
from src.features.risk_model import (
    calculate_total_risk,
    risk_level
)

from src.decision.decision_engine import choose_best_route

from src.services.traffic_analysis_service import (
    calculate_route_live_traffic
)

from src.services.incident_analysis_service import (
    calculate_route_incidents
)





try:
    from src.services.route_segment_service import (
        build_route_segments
    )

except Exception as e:

    print(
        "Route segment servisi yüklenemedi:",
        e
    )

    build_route_segments = None



ISTANBUL_DISTRICTS = {
    "kadıköy",
    "pendik",
    "beşiktaş",
    "üsküdar",
    "maltepe",
    "kartal",
    "ataşehir",
    "ümraniye",
    "sultanbeyli",
    "sancaktepe",
    "sapanca",
    "tuzla",
    "şile",
    "adalar",
    "bakırköy",
    "bahçelievler",
    "zeytinburnu",
    "fatih",
    "eyüpsultan",
    "sarıyer",
    "şişli",
    "kağıthane",
    "beyoğlu",
    "arnavutköy",
    "başakşehir",
    "esenyurt",
    "avcılar",
    "küçükçekmece",
    "büyükçekmece",
    "çatalca",
    "silivri"
}



def normalize_istanbul_query(query):

    query = query.strip()

    if "," in query:
        return query

    if query.lower() in ISTANBUL_DISTRICTS:
        return f"{query}, İstanbul"

    return query


def analyze_single_route(route, weather):

    # -------------------------
    # TRAFFIC
    # -------------------------
    try:

        traffic_result = (
            calculate_route_live_traffic(
                route
            )
        )

        route["traffic_level"] = (
            traffic_result.get(
                "traffic_level",
                "low"
            )
        )

        route["speed_ratio"] = (
            traffic_result.get(
                "weighted_ratio"
            )
            if traffic_result.get(
                "weighted_ratio"
            ) is not None
            else 0.7
        )

        route["min_speed_ratio"] = (
            traffic_result.get(
                "min_ratio"
            )
        )

        route["traffic_score_live"] = (
            traffic_result.get(
                "traffic_score",
                0
            )
        )

    except Exception as e:

        print(
            "Traffic analysis hatası:",
            e
        )

        route["traffic_level"] = "low"
        route["speed_ratio"] = 1.0
        route["min_speed_ratio"] = 1.0
        route["traffic_score_live"] = 0

    # -------------------------
    # INCIDENTS
    # -------------------------
    try:

        inc = calculate_route_incidents(
            route
        )

        route["incident_count"] = (
            inc.get("count", 0)
        )

        route["incident_level"] = (
            inc.get("level", "low")
        )

        route["incident_types"] = (
            inc.get("types", [])
        )

        route["incident_severity"] = (
            inc.get("severity", 0)
        )

        route["incident_points"] = (
            inc.get("points", [])
        )

    except Exception as e:

        print(
            "Incident analysis hatası:",
            e
        )

        route["incident_count"] = 0
        route["incident_level"] = "low"
        route["incident_types"] = []
        route["incident_severity"] = 0
        route["incident_points"] = []

    # -------------------------
    # WEATHER
    # -------------------------
    route["delay_min"] = route.get(
        "tomtom_traffic_delay_min",
        0
    )

    route["roadwork"] = False

    route["weather_risk"] = "low"

    route["rain"] = round(
        weather["rain"],
        1
    )

    route["snowfall"] = round(
        weather.get(
            "snowfall",
            0
        ),
        1
    )

    route["temperature"] = round(
        weather.get(
            "temperature",
            20
        ),
        1
    )

    route["visibility"] = round(
        weather.get(
            "visibility",
            10000
        ),
        1
    )

    route["wind"] = round(
        weather.get(
            "wind",
            0
        ),
        1
    )

    route["toll"] = False

    # -------------------------
    # WEATHER ALERTS
    # -------------------------

    route["weather_alerts"] = []

    weathercode = weather.get(
        "weathercode",
        -1
    )

    # ❄ KAR
    if weather.get("snowfall", 0) > 0:
        route["weather_alerts"].append(
            "SNOW"
        )

    # 🌫 SİS
    if weather.get(
        "visibility",
        10000
    ) < 2000:

        route["weather_alerts"].append(
            "FOG"
        )

    # 🧊 BUZLANMA
    if (
        weather.get(
            "temperature",
            20
        ) <= 1
        and weather.get(
            "rain",
            0
        ) > 0
    ):
        route["weather_alerts"].append(
            "ICE"
        )

    # 💨 KUVVETLİ RÜZGAR
    if weather.get("wind", 0) > 50:
        route["weather_alerts"].append(
            "WIND"
        )

    # 🌧 YOĞUN YAĞMUR
    if weather.get("rain", 0) > 5:
        route["weather_alerts"].append(
            "HEAVY_RAIN"
        )

    # ⛈ THUNDERSTORM
    if weathercode in [
        95
    ]:
        route["weather_alerts"].append(
            "THUNDERSTORM"
        )

    # ⚡ ŞİDDETLİ FIRTINA
    if weathercode in [
        96,
        99
    ]:
        route["weather_alerts"].append(
            "SEVERE_STORM"
        )

    # 🧊 DOLU
    if weathercode in [
        96,
        99
    ]:
        route["weather_alerts"].append(
            "HAIL"
        )

    # 🌨 TİPİ / YOĞUN KAR
    if (
        weathercode in [
            71,
            73,
            75,
            77,
            85,
            86
        ]
        and weather.get(
            "wind",
            0
        ) > 40
    ):
        route["weather_alerts"].append(
            "BLIZZARD"
        )

    # -------------------------
    # RISK
    # -------------------------
    try:

        risk = calculate_total_risk(
            route,
            weather
        )

        route["risk_score"] = risk

        route["risk_level"] = (
            risk_level(risk)
        )

    except Exception as e:

        print(
            "Risk hesaplama hatası:",
            e
        )

        route["risk_score"] = 0
        route["risk_level"] = "low"

    # -------------------------
    # TRAFFIC SEGMENTS
    # -------------------------
    try:

        if build_route_segments:

            route["traffic_segments"] = (
                build_route_segments(
                    route
                )
            )

        else:

            route["traffic_segments"] = []

    except Exception as e:

        print(
            "Traffic segment hatası:",
            e
        )

        route["traffic_segments"] = []

    return route


def analyze_routes(
    start=None,
    end=None,
    start_lat=None,
    start_lon=None
):

    if not end:
        return {
            "error":
            "Varış noktası boş olamaz."
        }

    end_query = normalize_istanbul_query(
        end
    )

    if (
        start_lat is not None
        and start_lon is not None
    ):

        start_location = {
            "query": "Mevcut Konum",
            "lat": start_lat,
            "lon": start_lon,
            "freeform_address":
            "Mevcut Konum"
        }

    else:

        if not start:
            return {
                "error":
                "Başlangıç noktası boş olamaz."
            }

        start_query = (
            normalize_istanbul_query(
                start
            )
        )

        start_location = geocode_place(
            start_query,
            limit=5,
            debug=False
        )

    end_location = geocode_place(
        end_query,
        limit=10,
        debug=True
    )
    print("START LOCATION =", start_location)
    print("END LOCATION =", end_location)

    if (
        not start_location
        or not end_location
    ):
        return {
            "error":
            "Başlangıç veya varış konumu bulunamadı."
        }

    try:
        print(
            "ROUTING:",
            start_location["lat"],
            start_location["lon"],
            end_location["lat"],
            end_location["lon"]
        )

        routes = get_tomtom_routes(
            start_lat=start_location["lat"],
            start_lon=start_location["lon"],
            end_lat=end_location["lat"],
            end_lon=end_location["lon"],
            max_alternatives=2
        )

    except Exception as e:

        return {
            "error": str(e)
        }

    # -------------------------
    # WEATHER LOAD
    # -------------------------
    try:

        weather_df = load_weather_data(
            lat=start_location["lat"],
            lon=start_location["lon"]
        )

        weather_now = weather_df.iloc[0]

        weather = {
            
            "rain": float(
                weather_now[
                    "precipitation"
                ]
            ),

            "visibility": float(
                weather_now[
                    "visibility"
                ]
            ),

            "wind": float(
                weather_now[
                    "wind_speed_10m"
                ]
            ),

            "snowfall": float(
                weather_now[
                    "snowfall"
                ]
            ),

            "temperature": float(
                weather_now[
                    "temperature_2m"
                ]
            ),

            "weathercode": int(
                weather_now[
                    "weathercode"
                ]
            )
        }
        print("WEATHER DATA:", weather)

    except Exception as e:

        print(
            "Weather hatası:",
            e
        )

        weather = {
            "rain": 0.0,
            "visibility": 10000.0,
            "wind": 0.0,
            "snowfall": 0.0,
            "temperature": 20.0,
            "weathercode": 0
        }

    analyzed_routes = []

    with ThreadPoolExecutor(
        max_workers=min(
            len(routes),
            3
        )
    ) as executor:

        futures = [
            executor.submit(
                analyze_single_route,
                route,
                weather
            )
            for route in routes
        ]

        for future in as_completed(
            futures
        ):

            try:

                analyzed_routes.append(
                    future.result()
                )

            except Exception as e:

                print(
                    "Route parallel analysis hatası:",
                    e
                )

    route_order = {
        route.get("route_id"): i
        for i, route in enumerate(routes)
    }

    routes = sorted(
        analyzed_routes,
        key=lambda r:
        route_order.get(
            r.get("route_id"),
            999
        )
    )

    try:

        fast_route, _ = (
            choose_best_route(
                routes,
                mode="fast"
            )
        )

        safe_route, _ = (
            choose_best_route(
                routes,
                mode="safe"
            )
        )

        balanced_route, all_routes = (
            choose_best_route(
                routes,
                mode="balanced"
            )
        )
        print("\n=== ROUTE SCORES ===")

        for r in all_routes:
            print(
                f"{r.get('route_name')} | "
                f"risk={r.get('risk_score')} | "
                f"incident={r.get('incident_count')} | "
                f"traffic={r.get('traffic_level')} | "
                f"score={r.get('decision_score')}"
            )

    except Exception as e:

        print(
            "Decision engine hatası:",
            e
        )

        all_routes = routes
        fast_route = routes[0]
        safe_route = routes[0]
        balanced_route = routes[0]


    return {
    "best_route": balanced_route,
    "recommended_route": balanced_route,

    "recommended_routes": {
        "fast": fast_route,
        "safe": safe_route,
        "balanced": balanced_route
    },

    "fast_route": fast_route,
    "safe_route": safe_route,
    "balanced_route": balanced_route,

    "all_routes": all_routes
}

    
        