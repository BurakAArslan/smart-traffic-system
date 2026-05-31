"use client";

import React from "react";
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type RouteMapProps = {
  routes: any[];
  bestRouteId: string | null;
  liveLat?: number | null;
  liveLon?: number | null;
  isDark?: boolean;
  isEnglish?: boolean;
};

export default function RouteMap({
  routes,
  bestRouteId,
  liveLat,
  liveLon,
  isDark,
  isEnglish,
}: RouteMapProps){
  if (!routes || routes.length === 0) return null;

  const selectedRoute =
    routes.find((r) => r.route_id === bestRouteId) || routes[0];

  if (
    !selectedRoute ||
    !selectedRoute.geometry ||
    !selectedRoute.geometry.coordinates ||
    selectedRoute.geometry.coordinates.length < 2
  ) {
    return null;
  }

  const firstCoords = selectedRoute.geometry.coordinates;

  const startPoint = firstCoords[0];
  const endPoint = firstCoords[firstCoords.length - 1];

  if (!startPoint || !endPoint) return null;

  const center: [number, number] = [
    (startPoint[1] + endPoint[1]) / 2,
    (startPoint[0] + endPoint[0]) / 2,
  ];

  const getSegmentColor = (level: string) => {

    if (level === "critical")
      return "#7f1d1d";

    if (level === "high")
      return "#ef4444";

    if (level === "medium")
      return "#f59e0b";

    return "#2563eb";
  };
  const getIncidentIcon = (type: string) => {
    if (type === "ACCIDENT") return "🚗";
    if (type === "ROAD_CLOSED") return "🚧";
    if (type === "CONSTRUCTION") return "🚧";
    if (type === "TRAFFIC_JAM") return "🚦";

    return "⚠️";
  };

  const getSeverityColor = (
    severity: string
  ) => {

    if (
      severity === "HIGH" ||
      severity === "high"
    ) {
      return "#ef4444";
    }

    if (
      severity === "MEDIUM" ||
      severity === "medium"
    ) {
      return "#f59e0b";
    }

    return "#22c55e";
  };

  const createIncidentMarkerIcon = (type: string) =>
    L.divIcon({
      html: `
        <div style="
          width: 26px;
          height: 26px;
          border-radius: 9999px;
          background: ${getSeverityColor(
            type === "ACCIDENT"
              ? "HIGH"
              : type === "ROAD_CLOSED"
              ? "MEDIUM"
              : "LOW"
          )};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        ">
          ${getIncidentIcon(type)}
        </div>
      `,
      className: "",
      iconSize: [26, 26],
      iconAnchor: [17, 17],
    });

  // Başlangıç ve canlı konum için mavi yön oku
const liveLocationIcon = L.divIcon({
  html: `
    <div style="
      position: relative;
      width: 42px;
      height: 42px;
      transform: rotate(0deg);
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));
    ">
      <svg
        width="42"
        height="42"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Beyaz dış çerçeve -->
        <path
          d="M50 6 L92 92 L50 72 L8 92 Z"
          fill="white"
        />

        <!-- Mavi ana şekil -->
        <path
          d="M50 12 L86 88 L50 68 L14 88 Z"
          fill="#2563eb"
        />

        <!-- Sol parlak yüzey -->
        <path
          d="M50 12 L50 68 L14 88 Z"
          fill="#3b82f6"
        />

        <!-- Sağ koyu yüzey -->
        <path
          d="M50 12 L86 88 L50 68 Z"
          fill="#1d4ed8"
        />

        <!-- Alt beyaz iç çizgi -->
        <path
          d="M50 68 L14 88"
          stroke="white"
          stroke-width="2"
          opacity="0.7"
        />

        <path
          d="M50 68 L86 88"
          stroke="white"
          stroke-width="2"
          opacity="0.4"
        />
      </svg>
    </div>
  `,
  className: "",
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

  // Varış noktası için kırmızı marker
  const destinationIcon = L.divIcon({
    html: `
      <div style="
        width: 22px;
        height: 22px;
        background: #ef4444;
        border: 4px solid white;
        border-radius: 9999px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      "></div>
    `,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "560px", width: "100%" }}
        className="z-0 rounded-2xl"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Başlangıç */}
        <Marker
          position={[startPoint[1], startPoint[0]]}
          icon={liveLocationIcon}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-bold text-blue-600">
                🧭 Başlangıç Noktası
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {startPoint[1].toFixed(5)}, {startPoint[0].toFixed(5)}
              </div>
            </div>
          </Popup>
        </Marker>

       {/* Varış Noktası */}
        <Marker
          position={[endPoint[1], endPoint[0]]}
          icon={destinationIcon}
        >
          <Tooltip
            permanent
            direction="top"
            offset={[0, -20]}
            className="!border-0 !bg-transparent !shadow-none"
          >
            <div className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
              🎯 {selectedRoute?.destination_name ||
                  selectedRoute?.end_location?.freeform_address ||
                  "Hedef"}
            </div>
          </Tooltip>

          <Popup>
            <div className="text-sm">
              <div className="font-bold text-red-600">
                🎯 Varış Noktası
              </div>

              <div className="mt-1 font-medium">
                {selectedRoute?.destination_name ||
                  selectedRoute?.end_location?.freeform_address ||
                  "Seçilen Hedef"}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {endPoint[1].toFixed(5)}, {endPoint[0].toFixed(5)}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Canlı Kullanıcı Konumu */}
        {liveLat !== null &&
        liveLat !== undefined &&
        liveLon !== null &&
        liveLon !== undefined && (
          <Marker
            position={[
              liveLat as number,
              liveLon as number,
            ]}
            icon={liveLocationIcon}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold text-blue-600">
                  📍 Canlı Konumunuz
                </div>
                <div>
                  {(liveLat as number).toFixed(5)},{" "}
                  {(liveLon as number).toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Rotalar */}
        {routes.map((route: any) => {
          if (
            !route?.geometry?.coordinates ||
            route.geometry.coordinates.length < 2
          ) {
            return null;
          }

          const isSelected = route.route_id === bestRouteId;

          const latlngs: [number, number][] =
            route.geometry.coordinates.map(
              ([lon, lat]: [number, number]) => [lat, lon]
            );

          return (
            <React.Fragment key={route.route_id}>
              {route.traffic_segments &&
              route.traffic_segments.length > 0 ? (
                route.traffic_segments.map(
                  (segment: any, index: number) => {
                    if (
                      !segment?.coordinates ||
                      segment.coordinates.length < 2
                    ) {
                      return null;
                    }

                    const segmentLatLngs: [number, number][] =
                      segment.coordinates.map(
                        ([lon, lat]: [number, number]) => [lat, lon]
                      );

                    return (
                      <Polyline
                        key={`${route.route_id}-${index}`}
                        positions={segmentLatLngs}
                        pathOptions={{
                          color: getSegmentColor(
                            segment.traffic_level
                          ),
                          weight: isSelected ? 8 : 5,
                          opacity: isSelected ? 0.95 : 0.5,
                          dashArray: isSelected
                            ? undefined
                            : "8 8",
                        }}
                      />
                    );
                  }
                )
              ) : (
                <Polyline
                  positions={latlngs}
                  pathOptions={{
                    color: isSelected
                      ? "#2563eb"
                      : "#3b82f6",
                    weight: isSelected ? 8 : 5,
                    opacity: isSelected ? 0.95 : 0.45,
                    dashArray: isSelected
                      ? undefined
                      : "8 8",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Incident Markerları */}
        {routes.map((route: any) =>
          route.incident_points?.map(
            (point: any, i: number) => {
              if (
                point?.lat === undefined ||
                point?.lon === undefined
              ) {
                return null;
              }
              

              return (
                <Marker
                  key={`incident-${route.route_id}-${i}`}
                  position={[point.lat, point.lon]}
                  icon={createIncidentMarkerIcon(
                    point.type || "UNKNOWN"
                  )}
                >
                  <Popup>
                    <div className="space-y-2 text-sm">

                    {/* Incident Type */}
                    
                    <div className="font-bold text-base">

                      {point.type === "ACCIDENT" &&
                        "🚗 " + (isEnglish ? "Accident" : "Kaza")}

                      {point.type === "ROAD_CLOSED" &&
                        "🚧 " + (isEnglish ? "Road Closed" : "Yol Kapalı")}

                      {point.type === "TRAFFIC_JAM" &&
                        "🚦 " + (isEnglish ? "Traffic Jam" : "Trafik Yoğunluğu")}

                      {point.type === "CONSTRUCTION" &&
                        "🛠 " + (isEnglish ? "Construction" : "Yol Çalışması")}

                      {point.type === "UNKNOWN" &&
                          (isEnglish
                          ? "⚠️ Traffic Incident"
                          : "⚠️ Trafik Olayı")}
                    </div>

                    {/* Severity */}
                    <div>
                      <strong>{isEnglish ? "Risk:" : "Risk:"}</strong>{" "}

                      <span
                        style={{
                          color: getSeverityColor(point.severity || "LOW"),
                          fontWeight: "bold",
                        }}
                      >
                        {String(point.severity || "LOW").toLowerCase() === "high" &&
                          (isEnglish ? "🔴 High" : "🔴 Yüksek")}

                        {String(point.severity || "LOW").toLowerCase() === "medium" &&
                          (isEnglish ? "🟠 Medium" : "🟠 Orta")}

                        {String(point.severity || "LOW").toLowerCase() === "low" &&
                          (isEnglish ? "🟢 Low" : "🟢 Düşük")}
                      </span>
                    </div>

                    {/* Route */}
                    <div>
                      <strong>
                        {isEnglish ? "Route:" : "Rota:"}
                      </strong>{" "}
                      {route.route_name?.replace(
                        "Route",
                        isEnglish ? "Route" : "Rota"
                      )}
                    </div>

                  
                     
                      
                    </div>
                  </Popup>
                </Marker>
              );
            }
          )
        )}
        
      </MapContainer>

      {/* Açıklama Kutusu */}
      <div className="absolute bottom-4 left-4 z-[500] rounded-2xl /95 p-4 text-sm shadow-lg">
       <span>{isEnglish ? "Normal traffic" : "Normal trafik"}</span>

        <div className="flex items-center gap-2">
          <span className="h-1 w-8 rounded-full bg-blue-600"></span>
          <span>{isEnglish ? "Normal traffic" : "Normal trafik"}</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="h-1 w-8 rounded-full bg-amber-500"></span>
          <span>{isEnglish ? "Medium traffic" : "Orta yoğunluk"}</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="h-1 w-8 rounded-full bg-red-500"></span>
          <span>{isEnglish ? "Heavy traffic" : "Yoğun trafik"}</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="h-1 w-8 rounded-full bg-red-900"></span>
          <span>
            {isEnglish
              ? "Critical congestion"
              : "Kritik yoğunluk"}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs">
            🚗
          </span>
          <span>{isEnglish ? "Traffic incident" : "Trafik olayı"}</span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="h-4 w-4 rounded-full bg-blue-600"></span>
          <span>{isEnglish ? "Your live location" : "Canlı konumunuz"}</span>
        </div>
      </div>
    </div>
  );
}