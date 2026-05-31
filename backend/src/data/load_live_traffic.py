import os
import requests
from dotenv import load_dotenv

load_dotenv()

TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")


def get_live_traffic_flow(lat, lon):
    """
    TomTom Traffic Flow API
    Verilen koordinat için anlık trafik akış verisini döndürür.
    Hata olursa sistemi çökertmez, güvenli varsayılan değer döndürür.
    """

    if not TOMTOM_API_KEY:
        print("[UYARI] TOMTOM_API_KEY bulunamadı.")
        return get_default_flow()

    url = (
        "https://api.tomtom.com/traffic/services/4/flowSegmentData/"
        "absolute/10/json"
    )

    params = {
        "key": TOMTOM_API_KEY,
        "point": f"{lat},{lon}",
        "unit": "KMPH"
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()

    except requests.exceptions.Timeout:
        print(f"[UYARI] Traffic Flow API timeout: ({lat}, {lon})")
        return get_default_flow()

    except requests.exceptions.HTTPError as e:
        print(f"[UYARI] Traffic Flow API HTTP hatası: {e}")
        return get_default_flow()

    except requests.exceptions.RequestException as e:
        print(f"[UYARI] Traffic Flow API bağlantı hatası: {e}")
        return get_default_flow()

    except Exception as e:
        print(f"[UYARI] Traffic Flow API beklenmeyen hata: {e}")
        return get_default_flow()


def get_default_flow():
    """
    API başarısız olursa sistemin devam etmesi için güvenli varsayılan trafik değeri.
    currentSpeed = freeFlowSpeed yapıyoruz ki trafik oranı 1.0 kabul edilsin.
    """
    return {
        "flowSegmentData": {
            "currentSpeed": 50,
            "freeFlowSpeed": 50,
            "currentTravelTime": 0,
            "freeFlowTravelTime": 0,
            "confidence": 0
        }
    }