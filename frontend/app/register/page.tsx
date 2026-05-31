"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { register } from "@/lib/api";
import { useSettings } from "@/lib/useSettings";

export default function RegisterPage() {
  const router = useRouter();
  const { isDark, isEnglish } = useSettings();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await register(username, email, password);
      router.push("/login");
    } catch (err: any) {
      setError(
        err.message ||
          (isEnglish ? "Registration failed." : "Kayıt başarısız.")
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
          <div className="mb-4 text-5xl">🚦</div>

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
              ? "Create a new account"
              : "Yeni hesap oluşturun"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          {/* Username */}
          <input
            type="text"
            placeholder={
              isEnglish ? "Username" : "Kullanıcı Adı"
            }
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full rounded-xl border p-4 outline-none transition ${
              isDark
                ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            }`}
            required
          />

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
                ? "Creating Account..."
                : "Kayıt Oluşturuluyor..."
              : isEnglish
              ? "Register"
              : "Kayıt Ol"}
          </button>
        </form>

        {/* Login Link */}
        <p
          className={`mt-6 text-center ${
            isDark
              ? "text-slate-300"
              : "text-slate-500"
          }`}
        >
          {isEnglish
            ? "Already have an account?"
            : "Zaten hesabın var mı?"}{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:underline"
          >
            {isEnglish ? "Sign In" : "Giriş Yap"}
          </Link>
        </p>
      </div>
    </main>
  );
}