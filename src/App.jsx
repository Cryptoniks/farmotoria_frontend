// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import HomePage from "./pages/HomePage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import FarmPage from "./pages/FarmPage";
import AnimalsPage from "./pages/AnimalsPage";
import InventoryPage from "./pages/InventoryPage";
import SeedShopPage from "./pages/SeedShopPage";
import MarketPage from "./pages/MarketPage";

import { api } from "./api";
import MainLayout from "./layout/MainLayout";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [user, setUser] = useState(null);

  // при загрузке проверяем токен и подтягиваем данные
  useEffect(() => {
    const access = localStorage.getItem("access");
    const auth = !!access;
    setIsAuthenticated(auth);

    if (access) {
      api
        .get("/api/me/", {
          headers: { Authorization: `Bearer ${access}` },
        })
        .then((res) => {
          setCoinsBalance(res.data.coins_balance || 0);
          setUser({
            username: res.data.username,
            coins_balance: res.data.coins_balance,
          });
        })
        .catch(() => {
          setIsAuthenticated(false);
          setUser(null);
        });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setIsAuthenticated(false);
    setUser(null);
  };

  // коллбек после успешного логина
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    // повторно тянем /api/me/
    const access = localStorage.getItem("access");
    if (access) {
      api
        .get("/api/me/", {
          headers: { Authorization: `Bearer ${access}` },
        })
        .then((res) => {
          setCoinsBalance(res.data.coins_balance || 0);
          setUser({
            username: res.data.username,
            coins_balance: res.data.coins_balance,
          });
        })
        .catch(() => {});
    }
  };

  return (
    <BrowserRouter>
      {/* Шапка/меню переедет внутрь MainLayout, но пока можем
          передавать нужные данные через пропсы */}
      <MainLayout
        user={user}
        isAuthenticated={isAuthenticated}
        coinsBalance={coinsBalance}
        onLogout={handleLogout}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />

          {!isAuthenticated && (
            <>
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/login"
                element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
              />
            </>
          )}

          {isAuthenticated && (
            <>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/farm/field" element={<FarmPage />} />
              <Route path="/farm/animals" element={<AnimalsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route
                path="/shop/seeds"
                element={<SeedShopPage setCoinsBalance={setCoinsBalance} />}
              />
              <Route
                path="/market"
                element={<MarketPage setCoinsBalance={setCoinsBalance} />}
              />
            </>
          )}
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;