import math


# -----------------------------------
# 1) TRAFFIC SCORE (0-100)
# -----------------------------------
def traffic_score(
    delay_min,
    speed_ratio=None
):

    score = 0

    # trafik gecikmesi
    score += min(
        delay_min * 1.5,
        50
    )

    # hız düşüşü
    if speed_ratio is not None:

        speed_ratio = max(
            0,
            min(speed_ratio, 1)
        )

        score += (
            (1 - speed_ratio)
            * 50
        )

    return round(
        min(score, 100),
        2
    )


# -----------------------------------
# 2) INCIDENT SCORE (0-100)
# -----------------------------------
def incident_score(route):

    severity = float(
        route.get(
            "incident_severity",
            0
        )
    )

    count = int(
        route.get(
            "incident_count",
            0
        )
    )

    incident_level = route.get(
        "incident_level",
        "low"
    )

    base = {
        "low": 0,
        "medium": 10,
        "high": 20,
        "critical": 30
    }.get(
        incident_level,
        0
    )

    score = (
        severity * 8
        + count * 2
        + base
    )

    return round(
        min(score, 50),
        2
    )


# -----------------------------------
# 3) WEATHER SCORE (0-100)
# -----------------------------------
def weather_score(
    precipitation,
    visibility,
    wind,
    snowfall=0,
    temperature=20
):

    score = 0

    # yağmur
    if precipitation > 15:
        score += 25

    elif precipitation > 8:
        score += 15

    elif precipitation > 3:
        score += 8

    elif precipitation > 0:
        score += 3

    # görüş
    if visibility < 200:
        score += 30

    elif visibility < 500:
        score += 20

    elif visibility < 1500:
        score += 12

    elif visibility < 5000:
        score += 5

    # rüzgar
    if wind > 70:
        score += 15

    elif wind > 50:
        score += 10

    elif wind > 25:
        score += 5

    # kar
    if snowfall > 10:
        score += 25

    elif snowfall > 5:
        score += 15

    elif snowfall > 1:
        score += 8

    # buzlanma
    if (
        temperature <= 1
        and precipitation > 0
    ):
        score += 30

    return round(
        min(score, 100),
        2
    )


# -----------------------------------
# 4) GEOMETRY SCORE (0-100)
# -----------------------------------
def geometry_score(route):

    coords = route["geometry"]["coordinates"]

    distance = float(
        route.get(
            "distance_km",
            0
        )
    )

    point_count = len(coords)

    turn_est = max(
        0,
        point_count / 15
    )

    score = 0

    score += min(
        distance * 0.15,
        10
    )

    score += min(
        turn_est * 0.2,
        8
    )

    return round(
        score,
        2
    )


# -----------------------------------
# 5) TOTAL RISK (0-100)
# -----------------------------------
def calculate_total_risk(
    route,
    weather
):

    t_score = traffic_score(
        route.get(
            "delay_min",
            0
        ),
        route.get(
            "speed_ratio",
            None
        )
    )

    i_score = incident_score(route)

    w_score = weather_score(
        precipitation=weather.get(
            "rain",
            0
        ),
        visibility=weather.get(
            "visibility",
            10000
        ),
        wind=weather.get(
            "wind",
            0
        ),
        snowfall=weather.get(
            "snowfall",
            0
        ),
        temperature=weather.get(
            "temperature",
            20
        )
    )

    g_score = geometry_score(route)

    total = (
        t_score * 0.45 +
        i_score * 0.30 +
        w_score * 0.20 +
        g_score * 0.05
    )

    return round(
        min(total, 100),
        2
    )


# -----------------------------------
# 6) RISK LEVEL
# -----------------------------------
def risk_level(score):

    if score < 15:
        return "low"

    elif score < 35:
        return "medium"

    elif score < 60:
        return "high"

    else:
        return "critical"