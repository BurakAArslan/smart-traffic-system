import os
import requests
from dotenv import load_dotenv
from urllib.parse import quote

load_dotenv()

TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")


ISTANBUL_KEYWORDS = {
    "kadıköy",
    "pendik",
    "beşiktaş",
    "üsküdar",
    "maltepe",
    "kartal",
    "ataşehir",
    "ümraniye",
    "sultanbeyli",
    "sancaktepe",
    "tuzla",
    "şile",
    "adalar",
    "bakırköy",
    "bahçelievler",
    "zeytinburnu",
    "fatih",
    "eyüpsultan",
    "sarıyer",
    "şişli",
    "kağıthane",
    "beyoğlu",
    "arnavutköy",
    "başakşehir",
    "esenyurt",
    "avcılar",
    "küçükçekmece",
    "büyükçekmece",
    "çatalca",
    "silivri"
}

PREFERRED_CITY_BY_QUERY = {
    "sapanca": "sakarya",
    "izmit": "kocaeli",
    "gebze": "kocaeli",
    "darıca": "kocaeli",
    "çayırova": "kocaeli",
    "cayirova": "kocaeli",
    "adapazarı": "sakarya",
    "adapazari": "sakarya",
    "serdivan": "sakarya",
    "kartepe": "kocaeli"
}


def normalize_text(text: str):
    return (
        str(text)
        .lower()
        .replace("ı", "i")
        .replace("İ", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )


def is_istanbul_query(query: str):
    q = normalize_text(query)

    return any(
        normalize_text(keyword) in q
        for keyword in ISTANBUL_KEYWORDS
    )


def result_text(result):
    address = result.get("address", {})

    return normalize_text(
        f"{address.get('freeformAddress', '')} "
        f"{address.get('municipality', '')} "
        f"{address.get('countrySecondarySubdivision', '')} "
        f"{address.get('countrySubdivision', '')}"
    )


def pick_best_result(results, query):

    if not results:
        return None

    query_norm = normalize_text(query)

    # 1) İstanbul ilçesi ise kesin İstanbul sonucu seç
    if is_istanbul_query(query):
        istanbul_results = [
            r for r in results
            if "istanbul" in result_text(r)
        ]

        if istanbul_results:
            return max(
                istanbul_results,
                key=lambda r: r.get("score", 0)
            )

    # 2) İstanbul çevresi sık kullanılan yerlerde doğru ili önceliklendir
    for place_name, preferred_city in PREFERRED_CITY_BY_QUERY.items():

        if place_name in query_norm:

            preferred_results = [
                r for r in results
                if normalize_text(preferred_city) in result_text(r)
            ]

            if preferred_results:
                return max(
                    preferred_results,
                    key=lambda r: r.get("score", 0)
                )

    # 3) Genel durumda: skor + İstanbul/Kocaeli/Sakarya yakın bölge önceliği
    preferred_region_results = [
        r for r in results
        if any(
            city in result_text(r)
            for city in [
                "istanbul",
                "kocaeli",
                "sakarya"
            ]
        )
    ]

    if preferred_region_results:
        return max(
            preferred_region_results,
            key=lambda r: r.get("score", 0)
        )

    # 4) Son çare: TomTom skoruna göre seç
    return max(
        results,
        key=lambda r: r.get("score", 0)
    )


def geocode_place(query, limit=10, debug=False):

    if not TOMTOM_API_KEY:
        print("[UYARI] TOMTOM_API_KEY bulunamadı.")
        return None

    query = query.strip()

    url = (
        f"https://api.tomtom.com/search/2/geocode/"
        f"{quote(query)}.json"
    )

    params = {
        "key": TOMTOM_API_KEY,
        "limit": limit,
        "language": "tr-TR",
        "countrySet": "TR",

        # İstanbul merkezli arama önyargısı
        "lat": 41.0082,
        "lon": 28.9784,
        "radius": 250000
    }

    try:
        res = requests.get(
            url,
            params=params,
            timeout=10
        )

        res.raise_for_status()

        data = res.json()
        results = data.get("results", [])

        if not results:
            return None

        if debug:
            print("\nGEOCODE SONUÇLARI:")
            for i, r in enumerate(results):
                address = r.get("address", {})
                print(
                    i,
                    address.get("freeformAddress"),
                    "| municipality:",
                    address.get("municipality"),
                    "| score:",
                    r.get("score")
                )

        best_result = pick_best_result(
            results,
            query
        )

        if not best_result:
            return None

        pos = best_result["position"]
        address = best_result.get("address", {})

        selected = {
            "lat": pos["lat"],
            "lon": pos["lon"],
            "query": query,
            "address": address.get("freeformAddress", ""),
            "municipality": address.get("municipality", ""),
            "countrySubdivision": address.get("countrySubdivision", ""),
            "score": best_result.get("score", 0)
        }

        if debug:
            print("\nSEÇİLEN SONUÇ:")
            print(selected)

        return selected

    except Exception as e:
        print("[UYARI] Geocoding hatası:", e)
        return None