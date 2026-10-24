// src/App.jsx
// Сайт из двух зон:
//   «/»      — главная страница с описанием и входом/регистрацией (только для гостей);
//   «/farm»  — игра на всё окно (только для вошедших игроков).
// Остальные адреса ведут туда, где игроку сейчас место.
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";

import LandingPage from "./features/landing/LandingPage";
import { api } from "./shared/services/api";

// Игра грузится по требованию: Pixi.js (~500 КБ) скачивается только на /farm
const GameLayout = lazy(() => import("./layout/GameLayout"));

function App() {
  // Начальное значение — по наличию токена, чтобы прямой заход на /farm не уводил на главную
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem("access")));
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [user, setUser] = useState(null); // данные /api/me/: имя, уровень, опыт, навыки…

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get("/api/me/");
      setUser(res.data);
      setCoinsBalance(res.data.coins_balance || 0);
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(Boolean(localStorage.getItem("access")));
    }
  }, []);

  // При загрузке и затем раз в 30 секунд: уровень и опыт растут прямо во время игры
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    fetchMe();
    const id = setInterval(fetchMe, 30000);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchMe]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setIsAuthenticated(false);
    setUser(null);
    setCoinsBalance(0);
  };

  const handleLoginSuccess = () => setIsAuthenticated(true);

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="page-loading">Загрузка…</div>}>
        <Routes>
          <Route
            path="/"
            element={isAuthenticated ? <Navigate to="/farm" replace /> : <LandingPage onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/farm"
            element={isAuthenticated ? (
              <GameLayout
                user={user}
                coinsBalance={coinsBalance}
                setCoinsBalance={setCoinsBalance}
                onLogout={handleLogout}
                onUserChanged={fetchMe}
              />
            ) : <Navigate to="/" replace />}
          />
          {/* Старые адреса: вход/регистрация теперь на главной, профиль — окно в игре,
              магазин, рынок, инвентарь — здания на ферме */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/farm" : "/"} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
