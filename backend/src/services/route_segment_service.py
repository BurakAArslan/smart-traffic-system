from src.data.load_live_traffic import get_live_traffic_flow


def get_segment_color_level(speed_ratio):

    if speed_ratio is None:
        return "normal"

    if speed_ratio < 0.35:
        return "critical"

    if speed_ratio < 0.60:
        return "high"

    if speed_ratio < 0.85:
        return "medium"

    return "normal"


def build_route_segments(route):

    coordinates = route.get(
        "geometry",
        {}
    ).get(
        "coordinates",
        []
    )

    if not coordinates or len(coordinates) < 2:
        return []

    distance_km = route.get(
        "distance_km",
        10
    )

    if distance_km < 10:
        step = 10

    elif distance_km < 30:
        step = 15

    else:
        step = 20

    segments = []

    for i in range(
        0,
        len(coordinates) - 1,
        step
    ):

        start = coordinates[i]

        end_index = min(
            i + step,
            len(coordinates) - 1
        )

        end = coordinates[end_index]

        mid_lon = (
            start[0] + end[0]
        ) / 2

        mid_lat = (
            start[1] + end[1]
        ) / 2

        try:

            traffic = get_live_traffic_flow(
                mid_lat,
                mid_lon
            )

            flow = traffic.get(
                "flowSegmentData",
                {}
            )

            current_speed = flow.get(
                "currentSpeed"
            )

            free_flow_speed = flow.get(
                "freeFlowSpeed"
            )

            if (
                current_speed is not None
                and free_flow_speed
                and free_flow_speed > 0
            ):
                speed_ratio = (
                    current_speed
                    / free_flow_speed
                )

            else:
                speed_ratio = None

            traffic_level = get_segment_color_level(
                speed_ratio
            )

        except Exception as e:

            print(
                "Segment trafik hatası:",
                e
            )

            speed_ratio = None
            traffic_level = "normal"

        segment_coords = coordinates[
            i:end_index + 1
        ]

        segments.append({
            "coordinates": segment_coords,
            "traffic_level": traffic_level,
            "speed_ratio": speed_ratio,
            "incident": False
        })

    return segments