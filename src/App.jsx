// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";

import HomePage from "./features/home/HomePage";
import RegisterPage from "./features/auth/RegisterPage";
import LoginPage from "./features/auth/LoginPage";
import { api } from "./shared/services/api";
import MainLayout from "./layout/MainLayout";

// Игровые страницы грузятся по требованию: Pixi.js (~500 КБ) скачивается только на /farm
const ProfilePage = lazy(() => import("./features/profile/ProfilePage"));
const IsoFarmPixi = lazy(() => import("./features/farm/IsoFarmPixi"));


function App() {
  // Начальное значение берём из токена сразу, иначе при прямом заходе на /farm, /profile
  // первая отрисовка идёт без игровых маршрутов ("No routes matched location")
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem("access")));
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [user, setUser] = useState(null);

  const fetchMe = async () => {
    try {
      const res = await api.get("/api/me/");
      const coins = res.data.coins_balance || 0;

      setCoinsBalance(coins);
      setUser({
        username: res.data.username,
        coins_balance: coins,
      });
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      setCoinsBalance(0);
    }
  };

  // при загрузке проверяем токен и подтягиваем данные
  useEffect(() => {
    const access = localStorage.getItem("access");
    if (access) {
      setIsAuthenticated(true);
      fetchMe();
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setIsAuthenticated(false);
    setUser(null);
    setCoinsBalance(0);
  };

  // коллбек после успешного логина
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    fetchMe();
  };

  return (
    <BrowserRouter>
      <MainLayout
        user={user}
        isAuthenticated={isAuthenticated}
        coinsBalance={coinsBalance}
        onLogout={handleLogout}
      >
        <Suspense fallback={<div className="page-loading">Загрузка…</div>}>
        <Routes key={isAuthenticated ? "auth" : "guest"}>
          <Route path="/" element={<HomePage />} />

          <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <HomePage />} />
          <Route path="/login" element={!isAuthenticated ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <HomePage />} />

          {isAuthenticated && (
            <>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/farm" element={<IsoFarmPixi setCoinsBalance={setCoinsBalance} />} />
              {/* Магазин, Рынок и Инвентарь теперь здания на ферме — старые адреса ведут туда */}
              {["/shop/*", "/market", "/inventory"].map((path) => (
                <Route key={path} path={path} element={<Navigate to="/farm" replace />} />
              ))}
            </>
          )}
        </Routes>
        </Suspense>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;