import os
import requests
from dotenv import load_dotenv

load_dotenv()

TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")


def get_incidents(lat, lon):
    if not TOMTOM_API_KEY:
        print("[UYARI] TOMTOM_API_KEY bulunamadı.")
        return []

    delta = 0.02  # büyük alan (test için iyi)

    min_lat = lat - delta
    max_lat = lat + delta
    min_lon = lon - delta
    max_lon = lon + delta

    bbox = f"{min_lon},{min_lat},{max_lon},{max_lat}"

    url = "https://api.tomtom.com/traffic/services/5/incidentDetails"

    params = {
        "key": TOMTOM_API_KEY,
        "bbox": bbox,
        "language": "tr-TR"
    }

    try:
        res = requests.get(url, params=params, timeout=4)
        res.raise_for_status()

        data = res.json()

        # ✅ BURADA olmalı
        print("INCIDENT COUNT:", len(data.get("incidents", [])))

        return data.get("incidents", [])

    except Exception as e:
        print("[UYARI] Incident API hatası:", e)
        return []