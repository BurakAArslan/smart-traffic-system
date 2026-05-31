const API_URL = "http://127.0.0.1:8000";

// =========================
// Token işlemleri
// =========================
export function saveToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function getToken() {
  return localStorage.getItem("access_token");
}

export function removeToken() {
  localStorage.removeItem("access_token");
}

export function isLoggedIn() {
  return !!getToken();
}

// =========================
// Kullanıcı Kaydı
// =========================
export async function register(
  username: string,
  email: string,
  password: string
) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Kayıt başarısız.");
  }

  return res.json();
}

// =========================
// Kullanıcı Girişi
// =========================
export async function login(
  email: string,
  password: string
) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Giriş başarısız.");
  }

  const data = await res.json();

  saveToken(data.access_token);

  return data;
}

// =========================
// Mevcut kullanıcı bilgisi
// =========================
export async function getCurrentUser() {
  const token = getToken();

  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Kullanıcı bilgisi alınamadı.");
  }

  return res.json();
}

// =========================
// Geçmiş rotalar
// =========================
export async function getRouteHistory(
  page = 1
) {
  const token = getToken();

  const res = await fetch(
    `${API_URL}/routes/history?page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Rota geçmişi alınamadı.");
  }

  return res.json();
}

// =========================
// Rota Analizi
// =========================
export async function analyzeRoute(
  start: string,
  end: string,
  startLat?: number | null,
  startLon?: number | null
) {
  const token = getToken();

  const body: any = {
    start,
    end,
  };

  if (
    startLat !== null &&
    startLat !== undefined &&
    startLon !== null &&
    startLon !== undefined
  ) {
    body.start_lat = startLat;
    body.start_lon = startLon;
  }

  const res = await fetch(`${API_URL}/route/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Rota analizi başarısız.");
  }

  return res.json();
}

// =========================
// Kullanıcı adı güncelle
// =========================
export async function updateUsername(
  newUsername: string
) {
  const token = getToken();

  const res = await fetch(
    `${API_URL}/auth/update-username`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        new_username: newUsername,
      }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.detail ||
      "Kullanıcı adı güncellenemedi."
    );
  }

  return res.json();
}

// =========================
// Şifre değiştir
// =========================
export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const token = getToken();

  const res = await fetch(
    `${API_URL}/auth/change-password`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(
      error.detail ||
      "Şifre değiştirilemedi."
    );
  }

  return res.json();
}