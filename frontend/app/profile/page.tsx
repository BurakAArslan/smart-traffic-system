"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCurrentUser,
  updateUsername,
  changePassword,
} from "@/lib/api";
import { useSettings } from "@/lib/useSettings";
export default function ProfilePage() {
  const { isDark, isEnglish } = useSettings()
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal durumları
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Form alanları
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // İşlem durumları
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const avatars = [
  "/uploads/avatars/avatar1.png",
  "/uploads/avatars/avatar2.png",
  "/uploads/avatars/avatar3.png",
  "/uploads/avatars/avatar4.png",
];
  // Kullanıcı bilgilerini yükle
  useEffect(() => {
    async function loadUser() {

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

        const data = await response.json();

        console.log("PROFILE DATA:", data);

        setUser(data);

      } catch (error) {

        console.error(
          "Kullanıcı bilgileri alınamadı:",
          error
        );

      } finally {

        setLoading(false);

      }
    }

    loadUser();

  }, []);

  // Kullanıcı adı güncelle
  async function handleUpdateUsername() {
    try {
      setActionLoading(true);
      setActionError("");
      setActionSuccess("");

      const result = await updateUsername(newUsername);

      setUser({
        ...user,
        username: result.username,
      });

      setActionSuccess("Kullanıcı adı başarıyla güncellendi.");
      setUsernameModalOpen(false);
      setNewUsername("");
    } catch (error: any) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Şifre değiştir
  async function handleChangePassword() {
    try {
      setActionLoading(true);
      setActionError("");
      setActionSuccess("");

      await changePassword(currentPassword, newPassword);

      setActionSuccess("Şifre başarıyla değiştirildi.");
      setPasswordModalOpen(false);

      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  }
  async function handlePhotoUpload(
    
  e: React.ChangeEvent<HTMLInputElement>
) {
  try {

    const file = e.target.files?.[0];

    if (!file) return;

    const token = localStorage.getItem("access_token");

    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch(
      "http://127.0.0.1:8000/profile/upload-photo",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await response.json();

    setUser({
      ...user,
      profile_image: data.image_url,
    });

    setActionSuccess(
      isEnglish
        ? "Profile photo updated successfully."
        : "Profil fotoğrafı başarıyla güncellendi."
    );

  } catch (error) {

    setActionError(
      isEnglish
        ? "Photo upload failed."
        : "Fotoğraf yüklenemedi."
    );
  }finally{
 setShowPhotoMenu(false);
}
}
async function handleSelectAvatar(
  avatar: string
) {

  try {

    const token = localStorage.getItem("access_token");

    await fetch(
      "http://127.0.0.1:8000/profile/select-avatar",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          avatar,
        }),
      }
    );

    setUser({
      ...user,
      profile_image: avatar,
    });

    setActionSuccess(
      isEnglish
        ? "Avatar updated successfully."
        : "Avatar başarıyla güncellendi."
    );

  } catch (error) {

    setActionError(
      isEnglish
        ? "Avatar update failed."
        : "Avatar güncellenemedi."
    );

  } finally {

    setShowPhotoMenu(false);

  }
}

  return (
    <main
        className={`min-h-screen p-6 transition-colors ${
            isDark
            ? "bg-slate-950 text-white"
            : "bg-slate-100 text-slate-900"
        }`}
        >
      <div className="mx-auto max-w-4xl">
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
                    isDark ? "text-white" : "text-slate-900"
                }`}
                >
                👤 {isEnglish ? "Profile" : "Profilim"}
                </h1>

                <p
                className={`mt-2 text-sm ${
                    isDark ? "text-slate-300" : "text-slate-700"
                }`}
                >
                {isEnglish
                    ? "View and manage your account information."
                    : "Hesap bilgilerinizi görüntüleyin."}
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

        {/* İçerik */}
        <div
            className={`rounded-3xl p-8 shadow-md ring-1 ${
                isDark
                ? "bg-slate-900 ring-slate-700"
                : "bg-white ring-slate-200"
            }`}
            >
          {loading ? (
            <p className="text-slate-500">Yükleniyor...</p>
          ) : !user ? (
            <p className="text-red-500">Kullanıcı bilgileri alınamadı.</p>
          ) : (
            <div className="space-y-6">
              {/* Avatar */}
            <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-3xl font-bold text-blue-700">

              {user.profile_image ? (

                <img
                  src={`http://127.0.0.1:8000/${String(
                    user.profile_image
                  ).replace(/^\/+/, "")}?t=${Date.now()}`}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (

                user.username?.charAt(0)?.toUpperCase()

              )}

            </div>

            <div>
                <h2
                className={`text-2xl font-bold ${
                    isDark ? "text-white" : "text-slate-900"
                }`}
                >
                {user.username}
                </h2>

                <p
                className={`font-medium ${
                    isDark ? "text-slate-300" : "text-slate-700"
                }`}
                >
                {isEnglish ? "User Profile" : "Kullanıcı Profili"}
                </p>
            </div>
            </div>

              {/* Başarı / Hata Mesajları */}
              {actionSuccess && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
                  {actionSuccess}
                </div>
              )}

              {actionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                  {actionError}
                </div>
              )}

              {/* Bilgi Kartları */}
             <div className="grid gap-4 md:grid-cols-2">
                {/* Username */}
                <div
                    className={`rounded-2xl border p-5 ${
                    isDark
                        ? "bg-slate-800 border-slate-700"
                        : "bg-slate-50 border-slate-200"
                    }`}
                >
                    <p
                    className={`text-sm font-medium ${
                        isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                    >
                    {isEnglish ? "Username" : "Kullanıcı Adı"}
                    </p>

                    <p
                    className={`mt-1 text-lg font-semibold ${
                        isDark ? "text-white" : "text-slate-900"
                    }`}
                    >
                    {user.username}
                    </p>
                </div>

                {/* Email */}
                <div
                    className={`rounded-2xl border p-5 ${
                    isDark
                        ? "bg-slate-800 border-slate-700"
                        : "bg-slate-50 border-slate-200"
                    }`}
                >
                    <p
                    className={`text-sm font-medium ${
                        isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                    >
                    {isEnglish ? "Email Address" : "E-posta Adresi"}
                    </p>

                    <p
                    className={`mt-1 break-all text-lg font-semibold ${
                        isDark ? "text-white" : "text-slate-900"
                    }`}
                    >
                    {user.email}
                    </p>
                </div>

                {/* User ID */}
                <div
                    className={`rounded-2xl border p-5 ${
                    isDark
                        ? "bg-slate-800 border-slate-700"
                        : "bg-slate-50 border-slate-200"
                    }`}
                >
                    <p
                    className={`text-sm font-medium ${
                        isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                    >
                    {isEnglish ? "User ID" : "Kullanıcı ID"}
                    </p>

                    <p
                    className={`mt-1 text-lg font-semibold ${
                        isDark ? "text-white" : "text-slate-900"
                    }`}
                    >
                    #{user.id}
                    </p>
                </div>

                {/* Account Status */}
                <div
                    className={`rounded-2xl border p-5 ${
                    isDark
                        ? "bg-slate-800 border-slate-700"
                        : "bg-slate-50 border-slate-200"
                    }`}
                >
                    <p
                    className={`text-sm font-medium ${
                        isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                    >
                    {isEnglish ? "Account Status" : "Hesap Durumu"}
                    </p>

                    <p className="mt-1 text-lg font-semibold text-green-500">
                    {isEnglish ? "Active" : "Aktif"}
                    </p>
                </div>
                </div>

              {/* Profil İşlemleri */}
             <div
                className={`rounded-2xl border p-5 ${
                    isDark
                    ? "bg-slate-800 border-slate-700"
                    : "bg-slate-50 border-slate-200"
                }`}
                >
              <h3
               className={`mb-4 text-lg font-semibold ${
                   isDark ? "text-white" : "text-slate-900"
               }`}
               >
               ⚙️ {isEnglish ? "Profile Actions" : "Profil İşlemleri"}
               </h3>

                <div className="grid gap-3 md:grid-cols-3">
                  
                  {/* Kullanıcı Adı Güncelle */}
                  <button
                    onClick={() => {
                      setActionError("");
                      setActionSuccess("");
                      setNewUsername(user.username);
                      setUsernameModalOpen(true);
                    }}
                    className="rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700"
                  >
                    👤 {isEnglish ? "Update Username" : "Kullanıcı Adı Güncelle"}
                  </button>

                  {/* Profil Fotoğrafı */}
                <div className="relative">
                  <button
                    onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                    className="w-full rounded-xl bg-purple-600 px-4 py-3 font-medium text-white transition hover:bg-purple-700"
                  >
                    🖼️ {isEnglish ? "Profile Photo" : "Profil Fotoğrafı"}
                  </button>

                  {showPhotoMenu && (
                      <div className="absolute left-0 top-full z-50 mt-3 w-full rounded-xl border border-white/10 bg-slate-900 p-3 shadow-lg">


                       <div className="mb-2">

                          <p className="mb-2 text-center text-sm text-white">
                            {isEnglish
                              ? "Choose Avatar"
                              : "Hazır Avatar Seç"}
                          </p>

                          <div className="grid grid-cols-2 gap-2">

                         {avatars.map((avatar) => (

                            <button
                              key={avatar}
                              onClick={() =>
                                handleSelectAvatar(avatar)
                              }
                              className="overflow-hidden rounded-xl border border-white/10 hover:border-blue-400"
                            >

                              <img
                                src={`http://127.0.0.1:8000${avatar}?v=${Date.now()}`}
                                alt="avatar"
                                className="h-20 w-full object-cover"
                              />

                            </button>

                          ))}  

                          <button
      onClick={() => {

        setUser({
          ...user,
          profile_image: null,
        });

        setShowPhotoMenu(false);

        setActionSuccess(
          isEnglish
            ? "Profile photo removed."
            : "Profil fotoğrafı kaldırıldı."
        );

      }}
      className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
    >
      {isEnglish
        ? "Remove Photo"
        : "Fotoğrafı Kaldır"}
    </button>
                            

                          </div>

                        </div>
                      </div>
                    )}
                </div>

                  {/* Şifre Değiştir */}
                  <button
                    onClick={() => {
                      setActionError("");
                      setActionSuccess("");
                      setCurrentPassword("");
                      setNewPassword("");
                      setPasswordModalOpen(true);
                    }}
                    className="rounded-xl bg-amber-500 px-4 py-3 font-medium text-white transition hover:bg-amber-600"
                  >
                    🔑 {isEnglish ? "Change Password" : "Şifre Değiştir"}
                  </button>
                </div>
                <p
                className={`mt-4 text-sm ${
                    isDark ? "text-slate-300" : "text-slate-700"
                }`}
                >
                {isEnglish
                    ? "These actions will be performed in modal windows on the same page."
                    : "Bu işlemler modal pencereler ile aynı sayfa üzerinde gerçekleştirilecektir."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kullanıcı Adı Güncelle Modal */}
      {usernameModalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setUsernameModalOpen(false)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className={`w-full max-w-md rounded-3xl p-6 shadow-2xl ${
                    isDark ? "bg-slate-900 text-white" : "bg-white"
                }`}
                >
              <h2
                className={`mb-4 text-2xl font-bold ${
                    isDark ? "text-white" : "text-slate-900"
                }`}
                >
                👤 {isEnglish ? "Update Username" : "Kullanıcı Adı Güncelle"}
                </h2>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
               className="w-full rounded-xl border border-slate-300 p-4 text-slate-900 placeholder:text-slate-500 outline-none"
              />

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setUsernameModalOpen(false)}
                className={`flex-1 rounded-xl border py-3 font-medium ${
                isDark
                    ? "border-slate-700 text-white hover:bg-slate-800"
                    : "border-slate-300 text-slate-800 hover:bg-slate-50"
                }`}
                >
                  {isEnglish ? "Cancel" : "İptal"}
                </button>

                <button
                  onClick={handleUpdateUsername}
                  disabled={actionLoading}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-medium text-white"
                >
                  {actionLoading
                    ? isEnglish
                        ? "Saving..."
                        : "Kaydediliyor..."
                    : isEnglish
                        ? "Save"
                        : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Şifre Değiştir Modal */}
      {passwordModalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setPasswordModalOpen(false)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div
                className={`w-full max-w-md rounded-3xl p-6 shadow-2xl ${
                    isDark ? "bg-slate-900 text-white" : "bg-white"
                }`}
                >
              <h2
            className={`mb-4 text-2xl font-extrabold ${
                isDark ? "text-white" : "text-slate-950"
            }`}
            >
            🔑 {isEnglish ? "Change Password" : "Şifre Değiştir"}
            </h2>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder={isEnglish ? "Current Password" : "Mevcut Şifre"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                   className={`w-full rounded-xl border p-4 outline-none ${
                    isDark
                        ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-400"
                        : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
                    }`}
              />

                <input
                  type="password"
                  placeholder={isEnglish ? "New Password" : "Yeni Şifre"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full rounded-xl border p-4 outline-none ${
                    isDark
                        ? "border-slate-700 bg-slate-800 text-white placeholder:text-slate-400"
                        : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
                    }`}
              
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setPasswordModalOpen(false)}
                className={`flex-1 rounded-xl border py-3 font-medium ${
                isDark
                    ? "border-slate-700 text-white hover:bg-slate-800"
                    : "border-slate-300 text-slate-800 hover:bg-slate-50"
                }`}
                >
                  {isEnglish ? "Cancel" : "İptal"}
                </button>

                <button
                  onClick={handleChangePassword}
                  disabled={actionLoading}
                  className="flex-1 rounded-xl bg-amber-500 py-3 font-medium text-white"
                >
                  {actionLoading
                    ? isEnglish
                        ? "Updating..."
                        : "Güncelleniyor..."
                    : isEnglish
                        ? "Change"
                        : "Değiştir"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}