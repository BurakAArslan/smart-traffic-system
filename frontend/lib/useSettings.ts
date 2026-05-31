"use client";

import { useEffect, useState } from "react";

export function useSettings() {
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("tr");
  const [notifications, setNotifications] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    const savedLanguage = localStorage.getItem("language") || "tr";
    const savedNotifications =
      localStorage.getItem("notifications");

    setTheme(savedTheme);
    setLanguage(savedLanguage);

    if (savedNotifications !== null) {
      setNotifications(savedNotifications === "true");
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem("theme", theme);
    localStorage.setItem("language", language);
    localStorage.setItem(
      "notifications",
      notifications.toString()
    );
  }, [theme, language, notifications, loaded]);

  const isDark = theme === "dark";
  const isEnglish = language === "en";

  return {
    theme,
    setTheme,
    language,
    setLanguage,
    notifications,
    setNotifications,
    isDark,
    isEnglish,
    loaded,
  };
}