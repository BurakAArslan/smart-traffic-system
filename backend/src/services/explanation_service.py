def generate_route_explanation(route, all_routes):

    explanations = []

    route_name = route.get("route_name", "Seçilen rota")

    time_min = route.get("estimated_time_min", 0)
    distance_km = route.get("distance_km", 0)

    delay_min = route.get(
        "tomtom_traffic_delay_min",
        0
    )

    risk_score = route.get(
        "risk_score",
        0
    )

    risk_level = route.get(
        "risk_level",
        "unknown"
    )

    traffic_level = route.get(
        "traffic_level",
        "unknown"
    )

    incident_count = route.get(
        "incident_count",
        0
    )

    weather_alerts = route.get(
        "weather_alerts",
        []
    )

    min_time = min(
        r.get("estimated_time_min", 9999)
        for r in all_routes
    )

    min_risk = min(
        r.get("risk_score", 9999)
        for r in all_routes
    )

    min_delay = min(
        r.get(
            "tomtom_traffic_delay_min",
            9999
        )
        for r in all_routes
    )

    if time_min == min_time:
        explanations.append(
            "en kısa süreli rota"
        )

    if risk_score == min_risk:
        explanations.append(
            "en düşük riskli rota"
        )

    if delay_min == min_delay:
        explanations.append(
            "en düşük trafik gecikmesine sahip rota"
        )

    if traffic_level == "low":
        explanations.append(
            "trafik yoğunluğu düşük"
        )

    elif traffic_level == "medium":
        explanations.append(
            "trafik yoğunluğu orta seviyede"
        )

    elif traffic_level == "high":
        explanations.append(
            "trafik yoğunluğu yüksek"
        )

    if incident_count == 0:
        explanations.append(
            "rota üzerinde olay bulunmuyor"
        )

    else:
        explanations.append(
            f"{incident_count} trafik olayı mevcut"
        )

    if weather_alerts:

        explanations.append(
            "hava durumu uyarıları: "
            + ", ".join(weather_alerts)
        )

    if not explanations:
        explanations.append(
            "genel değerlendirme sonucu önerildi"
        )

    main_reason = ", ".join(
        explanations[:4]
    )

    return (
        f"{route_name} önerildi çünkü "
        f"{main_reason}. "
        f"Tahmini süre {time_min} dk, "
        f"mesafe {distance_km} km, "
        f"trafik gecikmesi {delay_min} dk, "
        f"risk skoru {risk_score}, "
        f"risk seviyesi {risk_level} olarak hesaplandı."
    )