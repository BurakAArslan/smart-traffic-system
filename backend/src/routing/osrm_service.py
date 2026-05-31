import requests

def get_osrm_routes(start_lat, start_lon, end_lat, end_lon):
    url = (
        f"http://router.project-osrm.org/route/v1/driving/"
        f"{start_lon},{start_lat};{end_lon},{end_lat}"
        "?overview=full&alternatives=true&geometries=geojson"
    )

    response = requests.get(url, timeout=30)
    response.raise_for_status()
    data = response.json()

    routes_data = data.get("routes", [])
    parsed_routes = []

    for i, route in enumerate(routes_data):
        duration_min = route["duration"] / 60
        distance_km = route["distance"] / 1000

        parsed_routes.append({
            "route_id": chr(65 + i),
            "route_name": f"Route {chr(65 + i)}",
            "estimated_time_min": round(duration_min, 1),
            "distance_km": round(distance_km, 2),
            "geometry": route["geometry"]
        })

    return parsed_routes