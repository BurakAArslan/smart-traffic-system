"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { login } from "@/lib/api";
import { useSettings } from "@/lib/useSettings";

export default function LoginPage() {
  const router = useRouter();
  const { isDark, isEnglish } = useSettings();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.message ||
          (isEnglish ? "Login failed." : "Giriş başarısız.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className={`min-h-screen flex items-center justify-center px-4 transition-colors ${
        isDark
          ? "bg-slate-950 text-white"
          : "bg-slate-100 text-slate-900"
      }`}
    >
      <div
        className={`w-full max-w-md rounded-3xl border p-8 shadow-xl ${
          isDark
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white"
        }`}
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-5xl">🚗</div>

          <h1
            className={`text-3xl font-bold ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Smart Traffic System
          </h1>

          <p
            className={`mt-2 ${
              isDark
                ? "text-slate-300"
                : "text-slate-500"
            }`}
          >
            {isEnglish
              ? "Sign in to your account"
              : "Hesabınıza giriş yapın"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <input
            type="email"
            placeholder={
              isEnglish ? "Email Address" : "E-posta Adresi"
            }
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-xl border p-4 outline-none transition ${
              isDark
                ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            }`}
            required
          />

          {/* Password */}
          <input
            type="password"
            placeholder={isEnglish ? "Password" : "Şifre"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-xl border p-4 outline-none transition ${
              isDark
                ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            }`}
            required
          />

          {/* Error */}
          {error && (
            <p className="text-center text-sm text-red-500">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 p-4 font-semibold text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl disabled:opacity-60"
          >
            {loading
              ? isEnglish
                ? "Signing In..."
                : "Giriş Yapılıyor..."
              : isEnglish
              ? "Sign In"
              : "Giriş Yap"}
          </button>
        </form>

        {/* Register Link */}
        <p
          className={`mt-6 text-center ${
            isDark
              ? "text-slate-300"
              : "text-slate-500"
          }`}
        >
          {isEnglish
            ? "Don't have an account?"
            : "Hesabın yok mu?"}{" "}
          <Link
            href="/register"
            className="font-semibold text-blue-600 hover:underline"
          >
            {isEnglish ? "Register" : "Kayıt Ol"}
          </Link>
        </p>
      </div>
    </main>
  );
}