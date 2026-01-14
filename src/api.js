import axios from "axios";

const API_URL = "https://farmotoria-backend.onrender.com";

export const api = axios.create({
  baseURL: API_URL,
});

// Ответный интерсептор
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // если есть ответ от сервера
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // 401 или 403 — считаем, что с авторизацией проблема
      if (status === 401 || status === 403) {
        // проверяем сообщение simplejwt
        if (
          data?.code === "token_not_valid" ||
          data?.detail === "Given token not valid for any token type"
        ) {
          // очистка токенов
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");

          // принудительно на главную
          window.location.href = "/";
        }
      }
    }

    return Promise.reject(error);
  }
);