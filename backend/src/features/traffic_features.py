import numpy as np

def add_traffic_level(df):
    conditions = [
        (df["AVERAGE_SPEED"] < 40) | (df["NUMBER_OF_VEHICLES"] > 80),
        (df["AVERAGE_SPEED"] < 70) | (df["NUMBER_OF_VEHICLES"] > 30)
    ]
    choices = ["high", "medium"]

    df["traffic_level"] = np.select(conditions, choices, default="low")
    return df