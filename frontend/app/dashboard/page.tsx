"use client";
import toast, { Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";

import { getCurrentUser, getRouteHistory } from "@/lib/api";
import { analyzeRoute } from "@/lib/api";
import dynamic from "next/dynamic";
import { useSettings } from "@/lib/useSettings";

const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
});

export default function Home() {
  const { isDark, isEnglish } = useSettings();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [routeHistory, setRouteHistory] = useState<any[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [displayedChatResponse, setDisplayedChatResponse] = useState("");
  const [chatMessage, setChatMessage] =
  useState("");

  const [chatResponse, setChatResponse] =
    useState("");

  const [chatLoading, setChatLoading] =
    useState(false);
  const [messages, setMessages] =
  useState<any[]>([]);
  
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLon, setCurrentLon] = useState<number | null>(null);

  // Canlı konum takibi için state'ler
  const [liveLat, setLiveLat] = useState<number | null>(null);
  const [liveLon, setLiveLon] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastRerouteTime, setLastRerouteTime] = useState<number>(0);
  const REROUTE_DISTANCE = 100; // metre
  const REROUTE_COOLDOWN = 15000; // 15 saniye
  // İki nokta arası metre hesabı
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {

  const R = 6371e3;

  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;

  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(Δφ / 2) *
    Math.sin(Δφ / 2) +

    Math.cos(φ1) *
    Math.cos(φ2) *

    Math.sin(Δλ / 2) *
    Math.sin(Δλ / 2);

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}
  useEffect(() => {

  const savedRoute = localStorage.getItem(
    "selected_history_route"
  );

  if (!savedRoute) return;

  const routeData = JSON.parse(savedRoute);

  async function restoreRoute() {

    try {

      // inputları doldur
      setStart(routeData.origin || "");
      setEnd(routeData.destination || "");

      // canlı konum kullanılmış mı
      const isCurrentLocation =
        routeData.origin === "Mevcut Konum";

      if (isCurrentLocation) {
        setUseCurrentLocation(true);
      }

      // rota analizini tekrar yap
      const result = await analyzeRoute(
        routeData.origin,
        routeData.destination
      );

      if (result?.all_routes?.length > 0) {

        setData(result);
        
        console.log(
        "ROUTE RESULT:",
        result
      );

        setSelectedRouteId(
          result.best_route.route_id
        );
      }

    } catch (error) {

      console.error(
        "Geçmiş rota yüklenemedi:",
        error
      );
    }
  }

  restoreRoute();

  // tekrar tekrar açılmasın
  localStorage.removeItem(
    "selected_history_route"
  );

}, []);
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Tarayıcınız konum bilgisini desteklemiyor.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setCurrentLat(lat);
        setCurrentLon(lon);
        setLiveLat(lat);
        setLiveLon(lon);

        setUseCurrentLocation(true);
        setStart("Mevcut Konum");
        setError("");
      },
      () => {
        setError("Konum izni alınamadı.");
      }
    );
  };

  // Canlı konum takibini başlat
  const startLiveTracking = () => {
    if (!navigator.geolocation) {
      setError("Tarayıcınız canlı konum takibini desteklemiyor.");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setLiveLat(lat);
        setLiveLon(lon);

        // Rota yeniden hesaplandığında güncel konum kullanılsın
        setCurrentLat(lat);
        setCurrentLon(lon);

        setUseCurrentLocation(true);
        setStart("Mevcut Konum");
        setIsTracking(true);
        setError("");
      },
      () => {
        setError("Canlı konum alınamadı.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    setWatchId(id);
  };

  // Canlı konum takibini durdur
  const stopLiveTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    setWatchId(null);
    setIsTracking(false);
  };

  const handleSearch = async () => {
    if (!useCurrentLocation && !start.trim()) {
      setError("Başlangıç noktası girin.");
      return;
    }

    if (!end.trim()) {
      setError("Varış noktası girin.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await analyzeRoute(
        start,
        end,
        useCurrentLocation ? currentLat : null,
        useCurrentLocation ? currentLon : null
      );

      if (result.error) {
        setError(result.error);
        setData(null);
        setSelectedRouteId(null);
      } else {
        setData(result);
        
        const allIncidentPoints =
          result.all_routes?.flatMap(
            (r: any) => r.incident_points || []
          ) || [];

        const hasAccident =
          allIncidentPoints.some(
            (p: any) => p.type === "ACCIDENT"
          );

        const hasTraffic =
          allIncidentPoints.some(
            (p: any) => p.type === "TRAFFIC_JAM"
          );

        const hasRoadClosed =
          allIncidentPoints.some(
            (p: any) => p.type === "ROAD_CLOSED"
          );

        const hasConstruction =
          allIncidentPoints.some(
            (p: any) => p.type === "CONSTRUCTION"
          );

        if (hasAccident) {
          toast.error(
            isEnglish
              ? "Accident detected on route"
              : "🚗 Rota üzerinde kaza tespit edildi"
          );
        }

        if (hasTraffic) {
          toast(
            isEnglish
              ? "Traffic congestion detected"
              : "🚦 Trafik yoğunluğu tespit edildi"
          );
        }

        if (hasRoadClosed) {
          toast.error(
            isEnglish
              ? "Road closed ahead"
              : "🚧 Yol kapanması tespit edildi"
          );
        }

        if (hasConstruction) {
          toast(
            isEnglish
              ? "Road construction detected"
              : "🛠 Yol çalışması tespit edildi"
          );
        }
        setSelectedRouteId(result.best_route.route_id);
      }
    } catch {
      setError("Rota hesaplanırken bir hata oluştu.");
      setData(null);
      setSelectedRouteId(null);
    } finally {
      setLoading(false);
    }
  };
  const handleAssistantChat = async () => {

    if (!chatMessage ) return;

    const userMessage = chatMessage;

    // USER MESSAGE EKLE
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setChatMessage("");

    try {

      setChatLoading(true);

      setChatResponse("");
      setDisplayedChatResponse("");

      const token =
        localStorage.getItem(
          "access_token"
        );

      const response = await fetch(
        "http://127.0.0.1:8000/assistant/chat",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            

            message: userMessage,
            language: isEnglish ? "en" : "tr",

            history: [
              ...messages,
              {
                role: "user",
                content: userMessage,
              },
            ].slice(-6),

            route_data: data?.all_routes || [],
          }),
        }
      );

      const result =
        await response.json();

      const fullAnswer =
        result.answer || "";

      setChatResponse(fullAnswer);

      let index = 0;

      const interval =
        setInterval(() => {

          setDisplayedChatResponse(
            fullAnswer.slice(0, index)
          );

          index++;

          if (
            index > fullAnswer.length
          ) {

            clearInterval(interval);

            // AI MESSAGE EKLE
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: fullAnswer,
              },
            ]);

            setDisplayedChatResponse("");

            setChatLoading(false);
          }

        }, 25);

    } catch (err) {

      console.error(err);

      setDisplayedChatResponse(
        isEnglish
          ? "AI assistant error."
          : "AI asistanı hata verdi."
      );

      setChatLoading(false);
    }
  };

  
  const haversineDistanceMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
) => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getDistanceToRoute = (
  lat: number,
  lon: number,
  route: any
) => {
  const coords = route?.geometry?.coordinates;

  if (!coords || coords.length === 0) {
    return Infinity;
  }

  let minDistance = Infinity;

  for (const [routeLon, routeLat] of coords) {
    const distance = haversineDistanceMeters(
      lat,
      lon,
      routeLat,
      routeLon
    );

    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
};

useEffect(() => {
  if (!isTracking) return;
  if (liveLat === null || liveLon === null) return;
  if (!data?.all_routes) return;
  if (!selectedRouteId) return;
  if (!end.trim()) return;
  if (loading) return;

  const selectedRoute =
    data.all_routes.find(
      (r: any) => r.route_id === selectedRouteId
    ) || data.best_route;

  if (!selectedRoute) return;

  const distance = getDistanceToRoute(
    liveLat,
    liveLon,
    selectedRoute
  );

  // 100 metreden fazla sapma
  if (distance > REROUTE_DISTANCE) {
    const now = Date.now();

    // 30 saniyeden sık yeniden hesaplama yapma
    if (
      now - lastRerouteTime <
      REROUTE_COOLDOWN
    ) {
      return;
    }

    console.log(
      `Rotadan sapıldı (${Math.round(
        distance
      )} m). Yeni rota oluşturuluyor...`
    );

    setLastRerouteTime(now);
    (async () => {

    try {

      setLoading(true);

      const rerouteResult =
        await analyzeRoute(
          "Mevcut Konum",
          end,
          liveLat,
          liveLon
        );

      if (
        rerouteResult?.all_routes?.length > 0
      ) {

        setData(rerouteResult);

        setSelectedRouteId(
          rerouteResult.best_route.route_id
        );
      }

    } catch (error) {

      console.error(
        "Reroute başarısız:",
        error
      );

    } finally {

      setLoading(false);
    }

  })();
    }
}, [
  liveLat,
  liveLon,
  isTracking,
  data,
  selectedRouteId,
  end,
  lastRerouteTime,
  loading,
]);
  const getRouteTags = (route: any) => {
    if (!data?.recommended_routes) return [];

    const tags = [];

    if (route.route_id === data.recommended_routes.fast.route_id) {
      tags.push({ label: "En Hızlı", color: "bg-orange-500" });
    }

    if (route.route_id === data.recommended_routes.safe.route_id) {
      tags.push({ label: "En Güvenli", color: "bg-emerald-600" });
    }

    if (route.route_id === data.recommended_routes.balanced.route_id) {
      tags.push({ label: "Dengeli", color: "bg-purple-600" });
    }

    if (tags.length === 0) {
      tags.push({ label: "Alternatif", color: "bg-slate-500" });
    }

    return tags;
  };

  const translateTraffic = (level: string) => {
    if (isEnglish) {
      if (level === "low") return "Low";
      if (level === "medium") return "Medium";
      if (level === "high") return "Heavy";
      return level;
    }

    if (level === "low") return "Düşük";
    if (level === "medium") return "Orta";
    if (level === "high") return "Yoğun";

    return level;
  };
  const getWeatherLabel = (route: any) => {
    const alerts = route.weather_alerts || [];

    if (alerts.includes("BLIZZARD"))
      return isEnglish ? "🌨 Blizzard" : "🌨 Tipi";

    if (alerts.includes("SEVERE_STORM"))
      return isEnglish
        ? "⛈ Severe Storm"
        : "⛈ Şiddetli Fırtına";

    if (alerts.includes("THUNDERSTORM"))
      return isEnglish
        ? "⚡ Thunderstorm"
        : "⚡ Gök Gürültülü Fırtına";

    if (alerts.includes("ICE"))
      return isEnglish
        ? "🧊 Ice Risk"
        : "🧊 Buzlanma Riski";

    if (alerts.includes("SNOW"))
      return isEnglish
        ? "❄ Snow Risk"
        : "❄ Kar Riski";

    if (alerts.includes("FOG"))
      return isEnglish
        ? "🌫 Fog"
        : "🌫 Sisli";

    if (alerts.includes("HEAVY_RAIN"))
      return isEnglish
        ? "🌧 Heavy Rain"
        : "🌧 Yoğun Yağmur";

    if (alerts.includes("WIND"))
      return isEnglish
        ? "💨 Strong Wind"
        : "💨 Kuvvetli Rüzgar";

    return isEnglish
      ? "☀ Clear"
      : "☀ Açık";
  };

useEffect(() => {
  async function loadUserData() {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        "http://127.0.0.1:8000/profile",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const currentUser = await response.json();

      console.log("DASHBOARD USER:", currentUser);

      setUser(currentUser);

      const history = await getRouteHistory();
      setRouteHistory(history);
    } catch (error) {
      console.log("Kullanıcı giriş yapmamış olabilir.");
    }
  }

  loadUserData();
}, []);


  useEffect(() => {
  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}, [watchId]);

  return (
  <>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#0f172a",
          color: "#fff",
          border: "1px solid #334155",
        },
      }}
    />

    <main
        className={`min-h-screen transition-colors ${
          isDark
            ? "bg-slate-950 text-white"
            : "bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 text-slate-900"
        }`}
      >
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* HEADER */}
       <div
            className={`mb-8 rounded-3xl p-7 shadow-md ring-1 ${
              isDark
                ? "bg-slate-900 ring-slate-700"
                : "bg-white/90 ring-slate-200"
            }`}
          >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Sol taraf */}
            <div>
              <h1
                className={`text-3xl font-extrabold tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {isEnglish
                  ? "Istanbul Smart Traffic System"
                  : "İstanbul Akıllı Trafik Sistemi"}
              </h1>
                <p
                  className={`mt-2 text-sm ${
                    isDark ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {isEnglish
                    ? "Analyzes traffic, weather and safe driving recommendations together."
                    : "Trafik, hava durumu ve güvenli sürüş önerilerini birlikte analiz eder."}
                </p>
            </div>

            {/* Sağ taraf */}
           <div className="relative">
              <button
                onClick={() => setUserMenuOpen(true)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-2 shadow-sm transition ${
                isDark
                  ? "border-slate-700 bg-slate-800 hover:bg-slate-700"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              >
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-700 font-bold">

                  {user?.profile_image ? (

                    <img
                      src={`http://127.0.0.1:8000/${String(user.profile_image).replace(/^\/+/, "")}?v=${Date.now()}`}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />

                  ) : (

                    user?.username?.charAt(0)?.toUpperCase() || "U"

                  )}

                </div>

                <div className="text-left">
                 <div
                    className={`text-sm font-semibold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {user?.username || "Kullanıcı"}
                  </div>
                  <div
                    className={`text-xs ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {isEnglish ? "Account Menu" : "Hesap Menüsü"}
                  </div>
                </div>

                <span className="text-slate-400">▼</span>
              </button>
            </div>
          </div>
        </div>

        {/* INPUT */}
       <div
          className={`mb-8 rounded-3xl p-6 shadow-md ring-1 ${
            isDark
              ? "bg-slate-900 ring-slate-700"
              : "bg-white/95 ring-slate-200"
          }`}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start">
            {/* START */}
            <div>
             <label
              className={`text-sm font-semibold ${
                isDark ? "text-slate-200" : "text-slate-700"
              }`}
            >
              {isEnglish ? "Start" : "Başlangıç"}
            </label>

              <input
                value={start}
                placeholder={
                isEnglish
                  ? "Enter starting point"
                  : "Başlangıç noktası girin"
              }
                onChange={(e) => {
                  setStart(e.target.value);
                  setUseCurrentLocation(false);
                }}
                disabled={useCurrentLocation}
               className={`mt-2 w-full rounded-xl border p-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 disabled:bg-slate-900"
                  : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 disabled:bg-slate-100"
              }`}
              />

              <button
                onClick={handleUseCurrentLocation}
                className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:scale-105 hover:bg-blue-100 hover:text-blue-800 active:scale-95"
              >
                📍 {isEnglish ? "Use My Location" : "Konumumu Kullan"}
              </button>

              {/* Canlı Takip Butonu */}
              <button
                onClick={isTracking ? stopLiveTracking : startLiveTracking}
                className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:scale-105 hover:bg-emerald-100 active:scale-95"
              >
               {isTracking
                  ? `🛑 ${
                      isEnglish
                        ? "Stop Live Tracking"
                        : "Canlı Takibi Durdur"
                    }`
                  : `🟢 ${
                      isEnglish
                        ? "Start Live Tracking"
                        : "Canlı Takibi Başlat"
                    }`}
              </button>
            </div>

            {/* END */}
            <div className="md:pt-[2px]">
              <label
                className={`text-sm font-semibold ${
                  isDark ? "text-slate-200" : "text-slate-700"
                }`}
              >
                {isEnglish ? "Destination" : "Varış"}
              </label>

              <input
                value={end}
                placeholder={
                isEnglish
                  ? "Enter destination"
                  : "Varış noktası girin"
              }
                onChange={(e) => setEnd(e.target.value)}
                className={`mt-2 w-full rounded-xl border p-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 disabled:bg-slate-900"
                  : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 disabled:bg-slate-100"
              }`}
              />
            </div>

            {/* BUTTON */}
            <div className="md:pt-[30px]">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="h-[50px] w-full cursor-pointer rounded-xl bg-black p-3 font-semibold text-white shadow-md transition hover:scale-[1.02] hover:bg-slate-800 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading
                  ? isEnglish
                    ? "Calculating..."
                    : "Hesaplanıyor..."
                  : isEnglish
                  ? "Calculate Routes"
                  : "Rotaları Hesapla"}
              </button>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {/* HARITA */}
        {data && (
         <div
          className={`mb-6 rounded-3xl p-4 shadow-md ring-1 ${
            isDark
              ? "bg-slate-900 ring-slate-700"
              : "bg-white ring-slate-200"
          }`}
        >
          <RouteMap
          routes={data.all_routes}
          bestRouteId={selectedRouteId}
          liveLat={liveLat}
          liveLon={liveLon}
          isDark={isDark}
          isEnglish={isEnglish}
        />
          </div>
        )}

        {/* ROUTES */}
        {data && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {data.all_routes.map((route: any) => {
              const isSelected = route.route_id === selectedRouteId;
              const tags = getRouteTags(route);

              return (
                <div
                  key={route.route_id}
                  onClick={() => setSelectedRouteId(route.route_id)}
                  className={`cursor-pointer rounded-3xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                  isSelected
                    ? isDark
                      ? "border-blue-500 bg-blue-900/30"
                      : "border-blue-500 bg-blue-100"
                    : isDark
                    ? "border-slate-700 bg-slate-900 hover:border-blue-500"
                    : "border-slate-200 bg-white hover:border-blue-300"
                }`}
                >
                  <h3
                    className={`mb-3 text-lg font-bold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {route.route_name?.replace("Route", "Rota")}
                  </h3>

                  <div className="mb-4 flex flex-wrap gap-2">
                    {tags.map((t: any, i: number) => (
                      <span
                        key={i}
                        className={`rounded-lg px-2 py-1 text-xs font-semibold text-white ${t.color}`}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>

                  <div
                    className={`space-y-1 text-sm ${
                      
                      isDark ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                   <div>
                    ⏱ {isEnglish ? "Duration" : "Süre"}:{" "}
                    {route.estimated_time_min} {isEnglish ? "min" : "dk"}
                  </div>
                    <div>
                      📏 {isEnglish ? "Distance" : "Mesafe"}:{" "}
                      {route.distance_km} km
                    </div>
                   <div>
                      🚦 {isEnglish ? "Traffic" : "Trafik"}:{" "}
                      {translateTraffic(route.traffic_level)}
                    </div>

                    <div>
                      🚨 {isEnglish ? "Incidents" : "Olay"}:{" "}
                      {route.incident_count ?? 0}
                    </div>

                    <div>
                      ⚠️ {isEnglish ? "Risk" : "Risk"}:{" "}
                      {route.risk_level === "low"
                        ? (isEnglish ? "Low" : "Düşük")
                        : route.risk_level === "medium"
                        ? (isEnglish ? "Medium" : "Orta")
                        : route.risk_level === "high"
                        ? (isEnglish ? "High" : "Yüksek")
                        : route.risk_level === "critical"
                        ? (isEnglish ? "Critical" : "Kritik")
                        : route.risk_level}
                    </div>

                    <div>
                      {getWeatherLabel(route)}
                    </div>
                    {/* WEATHER ALERTS */}
                    {route.weather_alerts?.length > 0 && (
                      <div
                        className={`
                          mt-3 rounded-2xl border p-3 text-sm
                          ${
                            isDark
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
                              : "border-amber-200 bg-amber-50 text-amber-900"
                          }
                        `}
                      >
                        <div className="mb-2 font-semibold">
                          ⚠️ {isEnglish ? "Weather Alerts" : "Hava Uyarıları"}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {route.weather_alerts.map(
                            (alert: string, index: number) => {

                              let label = "";

                              switch (alert) {

                                case "SNOW":
                                  label = isEnglish
                                    ? "❄ Snow Risk"
                                    : "❄ Kar Riski";
                                  break;

                                case "FOG":
                                  label = isEnglish
                                    ? "🌫 Low Visibility"
                                    : "🌫 Düşük Görüş";
                                  break;

                                case "ICE":
                                  label = isEnglish
                                    ? "🧊 Ice Risk"
                                    : "🧊 Buzlanma Riski";
                                  break;

                                case "WIND":
                                  label = isEnglish
                                    ? "💨 Strong Wind"
                                    : "💨 Kuvvetli Rüzgar";
                                  break;

                                case "HEAVY_RAIN":
                                  label = isEnglish
                                    ? "🌧 Heavy Rain"
                                    : "🌧 Yoğun Yağmur";
                                  break;

                                default:
                                  label = alert;
                              }

                              return (
                                <span
                                  key={index}
                                  className={`
                                    rounded-full px-3 py-1 text-xs font-semibold
                                    ${
                                      isDark
                                        ? "bg-amber-400/20 text-amber-100"
                                        : "bg-amber-100 text-amber-900"
                                    }
                                  `}
                                >
                                  {label}
                                </span>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                    
                
                  <div
                    className={`mt-4 text-xs ${
                      isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                   {isEnglish
                    ? "Click card to select"
                    : "Kartı tıklayarak seç"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* AI TRAFFIC ASSISTANT */}

   
      <div
        className={`
          mt-6 rounded-3xl border p-5 shadow-xl backdrop-blur-sm
          ${
            isDark
              ? "border-white/10 bg-slate-900"
              : "border-gray-200 bg-white"
          }
        `}
      >

        <div className="mb-3 text-lg font-bold">
          🤖 {
            isEnglish
              ? "AI Traffic Assistant"
              : "AI Trafik Asistanı"
          }
        </div>

        <div className="flex gap-2">

          <input
            type="text"

            value={chatMessage}

            onChange={(e) =>
              setChatMessage(
                e.target.value
              )
            }

            placeholder={
              isEnglish
                ? "Ask something ..."
                : "Bir soru sor..."
            }

            className={`
              flex-1 rounded-xl border px-4 py-3
              ${
                isDark
                  ? "border-white/10 bg-black/20 text-white"
                  : "border-gray-300 bg-white text-black"
              }
            `}
          />

          <button
            onClick={handleAssistantChat}

            className="
              rounded-xl bg-blue-600
              px-5 py-3 font-semibold
              text-white hover:bg-blue-700
            "
          >
            {isEnglish ? "Ask" : "Sor"}
          </button>

              </div>

              {chatLoading && (
                <div className="mt-3 flex items-center gap-2 text-sm opacity-70">
                  <span>
                    {isEnglish ? "AI is thinking" : "AI düşünüyor"}
                  </span>

                  <span className="animate-pulse">...</span>
                </div>
              )}

              <div className="mt-4 max-h-[500px] space-y-3 overflow-y-auto pr-2">

        {messages.map((msg, index) => (

          <div
            key={index}
            className={`
              rounded-3xl p-4 text-sm leading-relaxed shadow-md
              ${
                msg.role === "user"
                  ? isDark
                    ? "bg-gradient-to-r from-blue-600/30 to-cyan-500/30 border border-cyan-400/20 text-white"
                    : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                  : isDark
                  ? "bg-white/5"
                  : "bg-gray-100"
              }
            `}
          >
            <div className="mb-1 text-xs opacity-60">
              {msg.role === "user"
                ? (isEnglish ? "You" : "Sen")
                : "AI"}
            </div>

            {msg.content}
          </div>
        ))}

        {chatLoading && displayedChatResponse && (
          <div
            className={`
              rounded-3xl p-4 text-sm leading-relaxed shadow-md
              ${
                isDark
                  ? "bg-white/5"
                  : "bg-gray-100"
              }
            `}
          >
            <div className="mb-1 text-xs opacity-60">
              AI
            </div>

            {displayedChatResponse}
            <span className="animate-pulse">|</span>
          </div>
        )}

      </div>


      </div>
    
{userMenuOpen && (
  <>
    {/* BACKDROP */}
    <div
      onClick={() => setUserMenuOpen(false)}
      className={`fixed inset-0 z-40 transition-all duration-300 ${
        userMenuOpen
          ? "bg-black/50 backdrop-blur-sm opacity-100"
          : "pointer-events-none opacity-0"
      }`}
    />

    {/* SLIDE SIDEBAR */}
    <div
      className={`fixed left-0 top-0 z-50 h-screen w-[360px]
      transform transition-transform duration-300 ease-in-out
      ${
        userMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div
        className={`h-full border-r shadow-2xl backdrop-blur-xl p-6 ${
          isDark
            ? "border-slate-700 bg-slate-900/95 text-white"
            : "border-slate-200 bg-white/95 text-slate-900"
        }`}
      >
        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            👤 {isEnglish ? "My Account" : "Hesabım"}
          </h2>

          <button
            onClick={() => setUserMenuOpen(false)}
            className="text-2xl text-slate-400 transition hover:text-white"
          >
            ×
          </button>
        </div>

        {/* USER CARD */}
        <div
          className={`mb-8 rounded-3xl border p-4 shadow-lg ${
            isDark
              ? "border-slate-700 bg-slate-800/80"
              : "border-slate-200 bg-slate-100"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-700 font-bold">

                  {user?.profile_image ? (

                    <img
                      src={`http://127.0.0.1:8000/${String(user.profile_image).replace(/^\/+/, "")}?v=${Date.now()}`}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />

                  ) : (

                    user?.username?.charAt(0)?.toUpperCase() || "U"

                  )}

                </div>

            <div>
              <p className="text-lg font-semibold">
                {user?.username || "User"}
              </p>

              <p
                className={`text-sm ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* MENU */}
        <div className="space-y-2">
          <a
            href="/profile"
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 hover:translate-x-1 ${
              isDark
                ? "text-slate-200 hover:bg-slate-800"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            👤 {isEnglish ? "Profile" : "Profilim"}
          </a>

          <a
            href="/history"
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 hover:translate-x-1 ${
              isDark
                ? "text-slate-200 hover:bg-slate-800"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            📜 {isEnglish ? "Route History" : "Geçmiş Rotalarım"}
          </a>

          <a
            href="/settings"
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 hover:translate-x-1 ${
              isDark
                ? "text-slate-200 hover:bg-slate-800"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            ⚙️ {isEnglish ? "Settings" : "Ayarlar"}
          </a>
        </div>

        {/* LOGOUT */}
        <div className="mt-8">
          <button
            onClick={() => {
              localStorage.removeItem("access_token");
              window.location.href = "/login";
            }}
            className="w-full rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02]"
          >
            🚪 {isEnglish ? "Logout" : "Çıkış Yap"}
          </button>
        </div>
      </div>
    </div>
  </>
)}
      </div>

          
    </main>
  </>
  );
}