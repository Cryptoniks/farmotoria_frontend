import axios from "axios";
import { getLanguage } from "../../i18n/core";

// Адрес бэкенда на Render задаётся переменной VITE_API_BASE_URL
// (Vercel → Project → Settings → Environment Variables).
// Локально по умолчанию — Django runserver.
export const API_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 20000,
});

// ===== токены =====
const getAccess = () => localStorage.getItem("access");
const getRefresh = () => localStorage.getItem("refresh");

function clearTokensAndGoHome() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  window.location.href = "/";
}

// ===== запрос: подставляем Bearer-токен =====
api.interceptors.request.use((config) => {
  const token = getAccess();
  config.headers = config.headers || {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Сервер отвечает (сообщения, названия) на языке, выбранном игроком
  config.headers["Accept-Language"] = getLanguage();
  return config;
});

// ===== ответ: при протухшем access один раз обновляем токен =====
// Все запросы, получившие 401 одновременно, ждут один и тот же refresh.
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    const refresh = getRefresh();
    refreshPromise = (refresh
      ? axios.post(`${API_URL}/api/auth/token/refresh/`, { refresh })
      : Promise.reject(new Error("No refresh token"))
    )
      .then((res) => {
        const { access, refresh: newRefresh } = res.data || {};
        if (!access) throw new Error("No access in refresh response");
        localStorage.setItem("access", access);
        if (newRefresh) localStorage.setItem("refresh", newRefresh); // ROTATE_REFRESH_TOKENS
        return access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const response = error.response;
    if (!response || !original) return Promise.reject(error);

    const tokenInvalid =
      response.status === 401 &&
      (response.data?.code === "token_not_valid" ||
        response.data?.detail === "Given token not valid for any token type");

    if (!tokenInvalid || original._retry) return Promise.reject(error);

    original._retry = true;
    try {
      const access = await refreshAccessToken();
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch (refreshError) {
      clearTokensAndGoHome();
      return Promise.reject(refreshError);
    }
  }
);
