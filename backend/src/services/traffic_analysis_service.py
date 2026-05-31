from src.data.load_live_traffic import get_live_traffic_flow


def sample_route_points(route_geometry, num_points):
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


def calculate_route_live_traffic(route):

    distance = route.get(
        "distance_km",
        10
    )

    num_points = min(
        20,
        max(
            5,
            int(distance / 2)
        )
    )

    sampled_points = sample_route_points(
        route["geometry"],
        num_points
    )

    ratios = []

    for lon, lat in sampled_points:

        try:

            flow = get_live_traffic_flow(
                lat,
                lon
            )["flowSegmentData"]

            current_speed = flow.get(
                "currentSpeed",
                0
            )

            free_flow_speed = flow.get(
                "freeFlowSpeed",
                0
            )

            if (
                free_flow_speed
                and free_flow_speed > 0
            ):
                ratios.append(
                    current_speed
                    / free_flow_speed
                )

        except Exception:
            continue

    if not ratios:

        return {
            "traffic_level": "unknown",
            "avg_ratio": None,
            "min_ratio": None,
            "traffic_score": 5
        }

    avg_ratio = (
        sum(ratios)
        / len(ratios)
    )

    min_ratio = min(ratios)

    weighted_ratio = (
        avg_ratio * 0.7
        + min_ratio * 0.3
    )

    traffic_score = round(
        (1 - weighted_ratio) * 10,
        2
    )

    if weighted_ratio < 0.25:
        level = "critical"

    elif weighted_ratio < 0.50:
        level = "high"

    elif weighted_ratio < 0.80:
        level = "medium"

    else:
        level = "low"

    return {
        "traffic_level": level,
        "avg_ratio": round(avg_ratio, 3),
        "min_ratio": round(min_ratio, 3),

        "weighted_ratio": round(
            weighted_ratio,
            3
        ),

        "traffic_score": traffic_score
    }