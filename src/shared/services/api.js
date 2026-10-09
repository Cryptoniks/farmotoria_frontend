import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_URL,
});

// ===== helpers =====
function getAccess() {
  return localStorage.getItem("access");
}

function getRefresh() {
  return localStorage.getItem("refresh");
}

function setTokens({ access, refresh }) {
  if (access) localStorage.setItem("access", access);
  if (refresh) localStorage.setItem("refresh", refresh);
}

function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

// ===== request interceptor: add Bearer token =====
api.interceptors.request.use(
  (config) => {
    const token = getAccess();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== refresh handling (no infinite loops) =====
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newAccess) {
  refreshSubscribers.forEach((cb) => cb(newAccess));
  refreshSubscribers = [];
}

async function refreshAccessToken() {
  const refresh = getRefresh();
  if (!refresh) throw new Error("No refresh token");

  // отдельный axios без интерсепторов, чтобы не зациклиться
  const res = await axios.post(`${API_URL}/api/auth/token/refresh/`, {
    refresh,
  });

  const newAccess = res.data?.access;
  if (!newAccess) throw new Error("No access in refresh response");

  setTokens({ access: newAccess });
  return newAccess;
}

// ===== response interceptor: try refresh on 401 token_not_valid =====
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // если нет ответа сервера — сеть/сервер упал
    if (!error.response) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const data = error.response.data;

    const isAuthError = status === 401 || status === 403;
    const isTokenInvalid =
      data?.code === "token_not_valid" ||
      data?.detail === "Given token not valid for any token type";

    // не пытаемся рефрешить:
    // - если это запрос на refresh
    // - если мы уже пробовали рефреш для этого запроса
    const isRefreshCall =
      originalRequest?.url?.includes("/api/auth/token/refresh/");
    if (isRefreshCall) {
      clearTokens();
      window.location.href = "/";
      return Promise.reject(error);
    }

    if (isAuthError && isTokenInvalid && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newAccess = await refreshAccessToken();
            onRefreshed(newAccess);
          } catch (refreshError) {
            clearTokens();
            window.location.href = "/";
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        // если refresh уже идёт — ждём
        return new Promise((resolve) => {
          subscribeTokenRefresh((newAccess) => {
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            resolve(api(originalRequest));
          });
        });
      } catch {
        isRefreshing = false;
        clearTokens();
        window.location.href = "/";
        return Promise.reject(error);
      }
    }

    // если любая другая 401/403 — просто отдаём ошибку
    if (isAuthError) {
      // можно по желанию чистить токены и редиректить,
      // но я оставляю только для token_not_valid
    }

    return Promise.reject(error);
  }
);