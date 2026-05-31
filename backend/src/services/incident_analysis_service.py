import math
from src.api.tomtom_incidents import get_incidents


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

    return R * (
        2 * math.atan2(
            math.sqrt(a),
            math.sqrt(1 - a)
        )
    )


def sample_route_points(
    route_geometry,
    distance_km
):

    num_points = min(
        15,
        max(
            5,
            int(distance_km / 2)
        )
    )

    coords = route_geometry["coordinates"]

    if len(coords) <= num_points:
        return coords

    indices = [
        int(
            i * (len(coords) - 1)
            / (num_points - 1)
        )
        for i in range(num_points)
    ]

    return [coords[i] for i in indices]


def map_tomtom_incident_type(
    incident
):
    """
    TomTom incident verisini
    gerçek tipe çevirir.
    """

    properties = incident.get(
        "properties", {}
    )

    icon_category = properties.get(
        "iconCategory"
    )

    if icon_category == 1:
        return "ACCIDENT"

    elif icon_category == 7:
        return "ROAD_CLOSED"

    elif icon_category == 8:
        return "CONSTRUCTION"

    elif icon_category == 9:
        return "TRAFFIC_JAM"

    return "UNKNOWN"


def calculate_route_incidents(
    route,
    num_points=2,
    max_distance_km=0.75
):
    sampled_points = sample_route_points(
        route["geometry"],
        route.get("distance_km", 5)
    )

    incident_types = []

    severity_score = 0
    seen_incidents = set()

    points = []

    for lon, lat in sampled_points:

        try:
            incidents = get_incidents(
                lat,
                lon
            )

        except Exception:
            incidents = []

        for inc in incidents:

            try:
                incident_id = (
                    inc.get("properties", {}).get("id")
                )

                if incident_id:

                    if incident_id in seen_incidents:
                        continue

                    seen_incidents.add(incident_id)
                                
                coords = inc["geometry"]["coordinates"]

                inc_lon, inc_lat = coords[0]

                dist = haversine(
                    lat,
                    lon,
                    inc_lat,
                    inc_lon
                )

                if dist <= max_distance_km:

                    # 🔥 GERÇEK INCIDENT TYPE
                    inc_type = map_tomtom_incident_type(
                        inc
                    )

                    incident_types.append(
                        inc_type
                    )

                    severity = (
                        inc.get(
                            "properties",
                            {}
                        ).get(
                            "magnitudeOfDelay",
                            0
                        )
                    )

                    # 🔥 marker için point
                    points.append({
                        "lat": inc_lat,
                        "lon": inc_lon,
                        "type": inc_type,
                        "severity": (
                            "HIGH"
                            if severity > 8
                            else "MEDIUM"
                            if severity > 4
                            else "LOW"
                        )
                    })

                    # 🔥 risk puanı
                    if inc_type == "ACCIDENT":
                        severity_score += 5 + severity

                    elif inc_type == "ROAD_CLOSED":
                        severity_score += 6 + severity

                    elif inc_type == "CONSTRUCTION":
                        severity_score += 3 + severity

                    elif inc_type == "TRAFFIC_JAM":
                        severity_score += 2 + severity

                    else:
                        severity_score += 1 + severity
            except Exception:
                continue

    if severity_score < 5:
        level = "low"

    elif severity_score < 15:
        level = "medium"

    elif severity_score < 30:
        level = "high"

    else:
        level = "critical"

    return {
        "count": len(points),
        "types": incident_types,
        "severity": severity_score,
        "level": level,
        "points": points
    }