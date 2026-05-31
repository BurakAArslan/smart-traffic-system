import os
import osmnx as ox

def load_osm_network(lat=40.991, lon=29.028, dist=1000):
    G = ox.graph_from_point((lat, lon), dist=dist, network_type="drive")
    nodes, edges = ox.graph_to_gdfs(G)

    os.makedirs("data/osm", exist_ok=True)
    edges.to_file("data/osm/kadikoy_roads.geojson", driver="GeoJSON")

    return G, nodes, edges