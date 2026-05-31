def score_route(route, mode="balanced"):

    score = 0.0

    # -------------------------
    # TIME
    # -------------------------

    time_weight = {
        "fast": 0.75,
        "safe": 0.25,
        "balanced": 0.45
    }.get(mode, 0.45)

    score += (
        route.get(
            "estimated_time_min",
            0
        )
        * time_weight
    )

    # -------------------------
    # RISK
    # -------------------------

    risk_weight = {
        "fast": 0.25,
        "safe": 0.75,
        "balanced": 0.55
    }.get(mode, 0.55)

    score += (
        route.get(
            "risk_score",
            0
        )
        * risk_weight
    )

    # -------------------------
    # DISTANCE
    # -------------------------

    distance_weight = {
        "fast": 0.05,
        "safe": 0.10,
        "balanced": 0.08
    }.get(mode, 0.08)

    score += (
        route.get(
            "distance_km",
            0
        )
        * distance_weight
    )

    # -------------------------
    # ROADWORK
    # -------------------------

    if route.get(
        "roadwork",
        False
    ):
        score += 5

    # -------------------------
    # TOLL
    # -------------------------

    if route.get(
        "toll",
        False
    ):

        if mode == "fast":
            score += 1

        elif mode == "safe":
            score += 0.5

        else:
            score += 0.8

    # -------------------------
    # WEATHER ALERTS
    # -------------------------

    alerts = route.get(
        "weather_alerts",
        []
    )

    if "ICE" in alerts:
        score += 12

    if "FOG" in alerts:
        score += 5

    if "SNOW" in alerts:
        score += 7

    if "HEAVY_RAIN" in alerts:
        score += 4

    if "WIND" in alerts:
        score += 3

    # ⛈ Gök gürültülü fırtına
    if "THUNDERSTORM" in alerts:
        score += 8

    # ⚡ Şiddetli fırtına
    if "SEVERE_STORM" in alerts:
        score += 12

    # 🧊 Dolu
    if "HAIL" in alerts:
        score += 10

    # 🌨 Tipi
    if "BLIZZARD" in alerts:
        score += 15

    # -------------------------
    # CRITICAL RISK
    # -------------------------

    if route.get(
        "risk_level"
    ) == "critical":

        score += 20

    return round(
        score,
        2
    )


def choose_best_route(
    routes,
    mode="balanced"
):

    scored = []

    for route in routes:

        temp = route.copy()

        temp["decision_score"] = (
            score_route(
                temp,
                mode
            )
        )

        scored.append(
                temp
        )

    scored = sorted(
        scored,
        key=lambda x:
        x["decision_score"]
    )

    return scored[0], scored