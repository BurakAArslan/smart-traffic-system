import os
import pandas as pd

def load_traffic_data():
    files = [
        r"data/ibb_traffic/traffic_density_202501.csv",
        r"data/ibb_traffic/traffic_density_202412.csv",
        r"data/ibb_traffic/traffic_density_202411.csv",
        r"data/ibb_traffic/traffic_density_202410.csv"
    ]

    dfs = []

    for file in files:
        if os.path.exists(file):
            print(f"Okunuyor: {file}")
            df_temp = pd.read_csv(file)
            dfs.append(df_temp)
        else:
            print(f"Dosya bulunamadı: {file}")

    if not dfs:
        raise FileNotFoundError("Hiçbir trafik dosyası okunamadı.")

    df = pd.concat(dfs, ignore_index=True)
    df["DATE_TIME"] = pd.to_datetime(df["DATE_TIME"], errors="coerce")

    return df