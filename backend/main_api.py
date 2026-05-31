from src.api.tomtom_geocoding import geocode_place
import math

from src.routing.tomtom_routing_service import get_tomtom_routes
from src.data.load_live_traffic import get_live_traffic_flow
from src.api.tomtom_incidents import get_incidents

from src.data.load_traffic import load_traffic_data
from src.features.traffic_features import add_traffic_level
from src.data.load_weather import load_weather_data
from src.data.load_osm import load_osm_network

from src.features.risk_model import calculate_total_risk, risk_level
from src.decision.decision_engine import choose_best_route


print("1) Trafik verisi yükleniyor...")
df = load_traffic_data()
df = add_traffic_level(df)

print("\n2) OSM yükleniyor...")
G, nodes, edges = load_osm_network()

print("\n3) Hava verisi yükleniyor...")
weather_df = load_weather_data()

weather_now = weather_df.iloc[0]
rain = float(weather_now["precipitation"])
visibility = float(weather_now["visibility"])
wind = float(weather_now["wind_speed_10m"])


# --------------------------------------------------
# GEOCODING ENTEGRASYONU
# --------------------------------------------------
print("\n4) Kullanıcı girdileri alınıyor...")

start_query = input("Başlangıç noktası: ").strip()
end_query = input("Varış noktası: ").strip()

if "istanbul" not in start_query.lower():
    start_query = f"{start_query}, İstanbul"

if "istanbul" not in end_query.lower():
    end_query = f"{end_query}, İstanbul"
mode = input("Mod seç (fast / safe / balanced): ").strip().lower()
if mode not in ["fast", "safe", "balanced"]:
    print("Geçersiz seçim yapıldı. Varsayılan olarak 'balanced' kullanılacak.")
    mode = "balanced"

if not start_query:
    print("Başlangıç boş bırakıldı. Varsayılan kullanılacak.")
    start_query = "Kadıköy, İstanbul"

if not end_query:
    print("Varış boş bırakıldı. Varsayılan kullanılacak.")
    end_query = "Taksim Meydanı, İstanbul"

print("\n5) Geocoding yapılıyor...")

start_location = geocode_place(start_query, limit=5, debug=True)
end_location = geocode_place(end_query, limit=5, debug=True)

# Geocoding başarısız olursa eski sabit koordinatlara düş
if start_location is None:
    print(f"Uyarı: Başlangıç konumu bulunamadı -> '{start_query}'")
    print("Eski sabit başlangıç koordinatları kullanılacak.")
    start_lat, start_lon = 40.991, 29.028
else:
    start_lat = start_location["lat"]
    start_lon = start_location["lon"]
    print(f"Başlangıç bulundu: {start_location['freeform_address']} -> ({start_lat}, {start_lon})")

if end_location is None:
    print(f"Uyarı: Varış konumu bulunamadı -> '{end_query}'")
    print("Eski sabit varış koordinatları kullanılacak.")
    end_lat, end_lon = 41.043, 29.009
else:
    end_lat = end_location["lat"]
    end_lon = end_location["lon"]
    print(f"Varış bulundu: {end_location['freeform_address']} -> ({end_lat}, {end_lon})")


print("\nTomTom rotaları çekiliyor...")
routes = get_tomtom_routes(
    start_lat=start_lat,
    start_lon=start_lon,
    end_lat=end_lat,
    end_lon=end_lon,
    max_alternatives=2
)


def sample_route_points(route_geometry, num_points=5):
    coords = route_geometry["coordinates"]

    if len(coords) <= num_points:
        return coords

    indices = [
        int(i * (len(coords) - 1) / (num_points - 1))
        for i in range(num_points)
    ]
    return [coords[i] for i in indices]


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)

    a = (
        math.sin(dLat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dLon / 2) ** 2
    )

    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def calculate_route_live_traffic(route, num_points=12):
    sampled_points = sample_route_points(route["geometry"], num_points)

    ratios = []

    for lon, lat in sampled_points:
        try:
            flow = get_live_traffic_flow(lat, lon)["flowSegmentData"]

            current_speed = flow.get("currentSpeed", 0)
            free_flow_speed = flow.get("freeFlowSpeed", 0)

            if free_flow_speed and free_flow_speed > 0:
                ratio = current_speed / free_flow_speed
                ratios.append(ratio)

        except Exception:
            continue

    if not ratios:
        return {
            "traffic_level": "unknown",
            "avg_ratio": None,
            "min_ratio": None,
            "traffic_score": 3
        }

    avg_ratio = sum(ratios) / len(ratios)
    min_ratio = min(ratios)

    # ağırlıklı skor:
    # ortalama durum + en kötü segment etkisi
    weighted_ratio = (avg_ratio * 0.7) + (min_ratio * 0.3)

    if weighted_ratio < 0.45:
        level = "high"
        score = 7
    elif weighted_ratio < 0.75:
        level = "medium"
        score = 4
    else:
        level = "low"
        score = 1

    return {
        "traffic_level": level,
        "avg_ratio": round(avg_ratio, 3),
        "min_ratio": round(min_ratio, 3),
        "traffic_score": score
    }


def calculate_route_incidents(route, num_points=5, max_distance_km=0.3):
    sampled_points = sample_route_points(route["geometry"], num_points)

    incident_types = []
    severity_score = 0

    for lon, lat in sampled_points:
        incidents = get_incidents(lat, lon)

        for inc in incidents:
            try:
                coords = inc["geometry"]["coordinates"]
                inc_lon, inc_lat = coords[0]

                dist = haversine(lat, lon, inc_lat, inc_lon)

                if dist <= max_distance_km:
                    inc_type = inc.get("type", "UNKNOWN")
                    incident_types.append(inc_type)

                    if inc_type == "ACCIDENT":
                        severity_score += 5
                    elif inc_type == "ROAD_CLOSED":
                        severity_score += 6
                    elif inc_type == "CONSTRUCTION":
                        severity_score += 3
                    elif inc_type == "TRAFFIC_JAM":
                        severity_score += 2
                    else:
                        severity_score += 1

            except Exception:
                continue

    count = len(incident_types)

    if severity_score == 0:
        level = "low"
    elif severity_score < 5:
        level = "medium"
    else:
        level = "high"

    return {
        "count": count,
        "types": incident_types,
        "severity": severity_score,
        "level": level
    }


print("\nRota analizi başlıyor...")

for route in routes:
    traffic_result = calculate_route_live_traffic(route)

    route["traffic_level"] = traffic_result["traffic_level"]
    route["speed_ratio"] = traffic_result["avg_ratio"] if traffic_result["avg_ratio"] is not None else 0.7
    route["min_speed_ratio"] = traffic_result["min_ratio"]
    route["traffic_score_live"] = traffic_result["traffic_score"]

    inc = calculate_route_incidents(route)
    route["incident_count"] = inc["count"]
    route["incident_level"] = inc["level"]
    route["incident_types"] = inc["types"]
    route["incident_severity"] = inc["severity"]

    route["delay_min"] = route.get("tomtom_traffic_delay_min", 0)

    weather = {
        "rain": rain,
        "visibility": visibility,
        "wind": wind
    }

    risk = calculate_total_risk(route, weather)
    route["risk_score"] = risk
    route["risk_level"] = risk_level(risk)

    route["roadwork"] = False
    route["weather_risk"] = "low"
    route["toll"] = False

    print(f"\n{route['route_name']}")
    print("Traffic:", route["traffic_level"])
    print("Incident level:", route["incident_level"])
    print("Incident count:", route["incident_count"])
    print("Incident types:", route["incident_types"])
    print("Incident severity:", route["incident_severity"])
    print("Delay:", route["delay_min"])
    print("Risk:", route["risk_level"], risk)
    print("Traffic level:", route["traffic_level"])
    print("Avg speed ratio:", route["speed_ratio"])
    print("Min speed ratio:", route["min_speed_ratio"])


best_route, all_routes = choose_best_route(routes, mode=mode)


def format_value(val):
    if isinstance(val, float):
        return round(val, 2)
    return val


def print_route_summary(route, show_header=True):
    if show_header:
        print(f"\n=== {route['route_name']} ===")

    print(f"Rota ID            : {route.get('route_id')}")
    print(f"Tahmini süre       : {format_value(route.get('estimated_time_min'))} dk")
    print(f"Mesafe             : {format_value(route.get('distance_km'))} km")
    print(f"Canlı ETA          : {format_value(route.get('tomtom_live_eta_min'))} dk")
    print(f"Gecikme            : {format_value(route.get('tomtom_traffic_delay_min'))} dk")
    print(f"Trafik seviyesi    : {route.get('traffic_level')}")
    print(f"Ortalama hız oranı : {format_value(route.get('speed_ratio'))}")
    print(f"Min hız oranı      : {format_value(route.get('min_speed_ratio'))}")
    print(f"Olay seviyesi      : {route.get('incident_level')}")
    print(f"Olay sayısı        : {route.get('incident_count')}")
    print(f"Olay şiddeti       : {route.get('incident_severity')}")
    print(f"Risk skoru         : {format_value(route.get('risk_score'))}")
    print(f"Risk seviyesi      : {route.get('risk_level')}")
    print(f"Karar skoru        : {format_value(route.get('decision_score'))}")

    incident_types = route.get("incident_types", [])
    if incident_types:
        print(f"Olay tipleri       : {', '.join(incident_types)}")
    else:
        print("Olay tipleri       : Yok")


print("\n" + "=" * 60)
print("ÖNERİLEN ROTA")
print("=" * 60)
print(f"Seçilen mod        : {mode}")
print_route_summary(best_route, show_header=False)

print("\n" + "=" * 60)
print("TÜM ROTALAR KARŞILAŞTIRMA")
print("=" * 60)

for i, r in enumerate(all_routes, start=1):
    print(
        f"{i}. {r['route_name']} | "
        f"Süre: {format_value(r.get('estimated_time_min'))} dk | "
        f"Mesafe: {format_value(r.get('distance_km'))} km | "
        f"Gecikme: {format_value(r.get('tomtom_traffic_delay_min'))} dk | "
        f"Risk: {format_value(r.get('risk_score'))} ({r.get('risk_level')}) | "
        f"Karar Skoru: {format_value(r.get('decision_score'))}"
    )