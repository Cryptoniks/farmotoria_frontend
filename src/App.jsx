// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import HomePage from "./features/home/HomePage";
import RegisterPage from "./features/auth/RegisterPage";
import LoginPage from "./features/auth/LoginPage";
import ProfilePage from "./features/profile/ProfilePage";
import InventoryPage from "./features/inventory/InventoryPage";
import SeedShopPage from "./features/shop/SeedShopPage";
import MarketPage from "./features/shop/MarketPage";
import IsoFarmPixi from "./features/farm/IsoFarmPixi";

import { api } from "./shared/services/api";
import MainLayout from "./layout/MainLayout";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
        <Routes key={isAuthenticated ? "auth" : "guest"}>
          <Route path="/" element={<HomePage />} />

          <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <HomePage />} />
          <Route path="/login" element={!isAuthenticated ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <HomePage />} />

          {isAuthenticated && (
            <>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/farm" element={<IsoFarmPixi />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/shop/seeds" element={<SeedShopPage setCoinsBalance={setCoinsBalance} />} />
              <Route path="/market" element={<MarketPage setCoinsBalance={setCoinsBalance} />} />
            </>
          )}
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;