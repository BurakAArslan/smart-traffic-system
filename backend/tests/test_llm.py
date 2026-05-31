from src.services.llm_explanation_service import generate_llm_explanation

sample_route = {
    "route_name": "Route A",
    "estimated_time_min": 24.5,
    "distance_km": 10.8,
    "tomtom_traffic_delay_min": 3.2,
    "traffic_level": "low",
    "risk_score": 14.8,
    "risk_level": "low",
    "incident_count": 0,
    "incident_level": "low",
}

text = generate_llm_explanation(sample_route)

print("\nLLM AÇIKLAMA:")
print(text)