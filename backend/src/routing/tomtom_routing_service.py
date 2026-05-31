import os
import requests
from dotenv import load_dotenv

load_dotenv()

TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")


def get_tomtom_routes(
    start_lat,
    start_lon,
    end_lat,
    end_lon,
    max_alternatives=2
):
    if not TOMTOM_API_KEY:
        raise ValueError("TOMTOM_API_KEY bulunamadı.")

    url = (
        f"https://api.tomtom.com/routing/1/calculateRoute/"
        f"{start_lat},{start_lon}:{end_lat},{end_lon}/json"
    )

    params = {
        "key": TOMTOM_API_KEY,
        "traffic": "true",
        
        "maxAlternatives": max_alternatives,
        "routeRepresentation": "polyline",
        "computeTravelTimeFor": "all",
        "language": "tr-TR"
    }

    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        routes = []

        for idx, r in enumerate(data.get("routes", [])):
            summary = r.get("summary", {})
            legs = r.get("legs", [])

            coordinates = []

            for leg in legs:
                points = leg.get("points", [])
                for p in points:
                    coordinates.append([p["longitude"], p["latitude"]])

            if not coordinates:
                continue

            travel_time_sec = summary.get("travelTimeInSeconds", 0)
            no_traffic_time_sec = summary.get("noTrafficTravelTimeInSeconds", travel_time_sec)
            traffic_delay_sec = max(travel_time_sec - no_traffic_time_sec, 0)

            route = {
                "route_id": chr(65 + idx),
                "route_name": f"Route {chr(65 + idx)}",
                "estimated_time_min": round(travel_time_sec / 60, 1),
                "distance_km": round(summary.get("lengthInMeters", 0) / 1000, 2),
                "tomtom_traffic_delay_min": round(traffic_delay_sec / 60, 1),
                "tomtom_live_eta_min": round(travel_time_sec / 60, 1),
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                
                }
            }

            routes.append(route)

        if not routes:
            raise ValueError("TomTom Routing API rota döndürmedi.")

        return routes

    except requests.exceptions.Timeout:
        raise RuntimeError("TomTom Routing API zaman aşımına uğradı.")

    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"TomTom Routing API HTTP hatası: {e}")

    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"TomTom Routing API bağlantı hatası: {e}")

    except Exception as e:
        raise RuntimeError(f"TomTom Routing API beklenmeyen hata: {e}")
    
    