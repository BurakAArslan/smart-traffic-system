"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getRouteHistory } from "@/lib/api";
import { useSettings } from "@/lib/useSettings";

export default function HistoryPage() {
  const router = useRouter();
  const { isDark, isEnglish } = useSettings();

  const [routes, setRoutes] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);

        const data = await getRouteHistory(page);

        setRoutes(data.routes || []);
        setTotalPages(data.total_pages || 1);

      } catch (error) {
        console.error("Geçmiş rotalar yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [page]);

  return (
    <main
      className={`min-h-screen p-6 transition-colors ${
        isDark
          ? "bg-slate-950 text-white"
          : "bg-slate-100 text-slate-900"
      }`}
    >
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div
          className={`mb-8 rounded-3xl p-7 shadow-md ring-1 ${
            isDark
              ? "bg-slate-900 ring-slate-700"
              : "bg-white ring-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1
                className={`text-3xl font-extrabold ${
                  isDark ? "text-white" : "text-slate-950"
                }`}
              >
                📜 {isEnglish ? "Route History" : "Geçmiş Rotalarım"}
              </h1>

              <p
                className={`mt-2 text-sm ${
                  isDark
                    ? "text-slate-300"
                    : "text-slate-700"
                }`}
              >
                {isEnglish
                  ? "All previously created routes are listed here."
                  : "Daha önce oluşturduğun tüm rotalar burada listelenir."}
              </p>
            </div>

            <Link
              href="/dashboard"
              className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
            >
              ← {isEnglish ? "Home" : "Ana Sayfa"}
            </Link>
          </div>
        </div>

        {/* Content */}
        <div
          className={`rounded-3xl p-6 shadow-md ring-1 ${
            isDark
              ? "bg-slate-900 ring-slate-700"
              : "bg-white ring-slate-200"
          }`}
        >

          {loading ? (

            <p
              className={
                isDark ? "text-slate-300" : "text-slate-500"
              }
            >
              {isEnglish ? "Loading..." : "Yükleniyor..."}
            </p>

          ) : routes.length === 0 ? (

            <p
              className={
                isDark ? "text-slate-300" : "text-slate-500"
              }
            >
              {isEnglish
                ? "No saved routes yet."
                : "Henüz kayıtlı rota bulunmuyor."}
            </p>

          ) : (

            <>
              <div className="space-y-4">

                {routes.map((route) => (

                 <div
                    key={route.id}
                    onClick={() => {

                      localStorage.setItem(
                        "selected_history_route",
                        JSON.stringify(route)
                      );

                      router.push("/dashboard");
                    }}
                    className={`cursor-pointer rounded-2xl border p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl ${
                      isDark
                        ? "border-slate-700 bg-slate-800"
                        : "border-slate-200 bg-white"
                    }`}
                  >

                    {/* Route Title + Date */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <h2
                      className={`text-xl font-bold ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {route.origin} → {route.destination}
                    </h2>

                    <div
                      className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold ${
                        isDark
                          ? "border-slate-700 bg-slate-900 text-slate-300"
                          : "border-slate-200 bg-slate-100 text-slate-700"
                      }`}
                    >
                      🕒{" "}
                      {new Date(route.created_at).toLocaleString("tr-TR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                    {/* Route Details */}
                    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">

                      {/* Route Type */}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🛣️</span>

                        <div>
                          <p className="text-sm text-slate-400">
                            {isEnglish
                              ? "Route Type"
                              : "Rota Tipi"}
                          </p>

                          <p
                            className={`font-semibold ${
                              isDark
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {route.route_type}
                          </p>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⏱️</span>

                        <div>
                          <p className="text-sm text-slate-400">
                            {isEnglish
                              ? "Duration"
                              : "Süre"}
                          </p>

                          <p
                            className={`font-semibold ${
                              isDark
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {route.duration_min?.toFixed(1)}{" "}
                            {isEnglish ? "min" : "dk"}
                          </p>
                        </div>
                      </div>

                      {/* Distance */}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📏</span>

                        <div>
                          <p className="text-sm text-slate-400">
                            {isEnglish
                              ? "Distance"
                              : "Mesafe"}
                          </p>

                          <p
                            className={`font-semibold ${
                              isDark
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {route.distance_km?.toFixed(1)} km
                          </p>
                        </div>
                      </div>

                      {/* Traffic */}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🚦</span>

                        <div>
                          <p className="text-sm text-slate-400">
                            {isEnglish
                              ? "Traffic"
                              : "Trafik"}
                          </p>

                          <p
                            className={`font-semibold ${
                              isDark
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {route.traffic_level || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AI Explanation */}
                   
                    
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-8 flex items-center justify-center gap-4">

                <button
                  onClick={() =>
                    setPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={page === 1}
                  className={`rounded-xl px-4 py-2 font-medium transition ${
                    page === 1
                      ? "cursor-not-allowed opacity-40"
                      : "hover:scale-105"
                  } ${
                    isDark
                      ? "bg-slate-800 text-white"
                      : "bg-slate-200 text-slate-900"
                  }`}
                >
                  ← {isEnglish ? "Previous" : "Önceki"}
                </button>

                <div
                  className={`rounded-xl px-4 py-2 font-semibold ${
                    isDark
                      ? "bg-slate-800 text-white"
                      : "bg-slate-200 text-slate-900"
                  }`}
                >
                  {isEnglish
                    ? `Page ${page} / ${totalPages}`
                    : `Sayfa ${page} / ${totalPages}`}
                </div>

                <button
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(prev + 1, totalPages)
                    )
                  }
                  disabled={page === totalPages}
                  className={`rounded-xl px-4 py-2 font-medium transition ${
                    page === totalPages
                      ? "cursor-not-allowed opacity-40"
                      : "hover:scale-105"
                  } ${
                    isDark
                      ? "bg-slate-800 text-white"
                      : "bg-slate-200 text-slate-900"
                  }`}
                >
                  {isEnglish ? "Next" : "Sonraki"} →
                </button>

              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}