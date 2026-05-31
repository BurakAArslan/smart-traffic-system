import requests
import pandas as pd


def load_weather_data(
    lat=40.991,
    lon=29.028
):
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&hourly="
        "temperature_2m,"
        "precipitation,"
        "visibility,"
        "wind_speed_10m,"
        "snowfall,"
        "weathercode"
        "&forecast_days=2"
    )

    resp = requests.get(
        url,
        timeout=30
    )

    resp.raise_for_status()

    data = resp.json()

    weather_df = pd.DataFrame(
        data["hourly"]
    )

    return weather_df