"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("tr");
  const [saved, setSaved] = useState(false);

  const isDark = theme === "dark";
  const isEnglish = language === "en";

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    const savedNotifications = localStorage.getItem("notifications");
    const savedLanguage = localStorage.getItem("language") || "tr";

    setTheme(savedTheme);
    setLanguage(savedLanguage);

    if (savedNotifications !== null) {
      setNotifications(savedNotifications === "true");
    }
  }, []);

  function handleSave() {
    localStorage.setItem("theme", theme);
    localStorage.setItem("notifications", notifications.toString());
    localStorage.setItem("language", language);

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  return (
    <main
      className={`min-h-screen p-6 transition ${
        isDark
          ? "bg-slate-950 text-white"
          : "bg-slate-100 text-slate-950"
      }`}
    >
      <div className="mx-auto max-w-4xl">
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
                ⚙️ {isEnglish ? "Settings" : "Ayarlar"}
              </h1>
              <p
                className={`mt-2 text-sm ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                {isEnglish
                  ? "Edit your application preferences."
                  : "Uygulama tercihlerinizi düzenleyin."}
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

        {saved && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            {isEnglish
              ? "Settings saved successfully."
              : "Ayarlar başarıyla kaydedildi."}
          </div>
        )}

        <div
          className={`space-y-6 rounded-3xl p-8 shadow-md ring-1 ${
            isDark
              ? "bg-slate-900 ring-slate-700"
              : "bg-white ring-slate-200"
          }`}
        >
          <div>
            <label
              className={`mb-2 block font-semibold ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              🌙 {isEnglish ? "Theme" : "Tema"}
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className={`w-full rounded-xl border p-4 ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-white"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
            >
              <option value="light">
                {isEnglish ? "Light Theme" : "Açık Tema"}
              </option>
              <option value="dark">
                {isEnglish ? "Dark Theme" : "Koyu Tema"}
              </option>
            </select>
          </div>

          <div
            className={`flex items-center justify-between rounded-2xl border p-5 ${
              isDark
                ? "border-slate-700 bg-slate-800"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div>
              <h3
                className={`font-semibold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                🔔 {isEnglish ? "Notifications" : "Bildirimler"}
              </h3>
              <p
                className={`text-sm ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                {isEnglish
                  ? "Turn system notifications on or off."
                  : "Sistem bildirimlerini aç veya kapat."}
              </p>
            </div>

            <button
              onClick={() => setNotifications(!notifications)}
              className={`rounded-xl px-4 py-2 font-medium text-white transition ${
                notifications
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-slate-500 hover:bg-slate-600"
              }`}
            >
              {notifications
                ? isEnglish
                  ? "On"
                  : "Açık"
                : isEnglish
                ? "Off"
                : "Kapalı"}
            </button>
          </div>

          <div>
            <label
              className={`mb-2 block font-semibold ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              🌍 {isEnglish ? "Language" : "Dil"}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`w-full rounded-xl border p-4 ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-white"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            className="w-full rounded-xl bg-blue-600 py-4 text-lg font-semibold text-white transition hover:bg-blue-700"
          >
            💾 {isEnglish ? "Save Settings" : "Ayarları Kaydet"}
          </button>
        </div>
      </div>
    </main>
  );
}