// Игровая страница: узкая шапка и карта на всё оставшееся окно.
import { useState } from "react";
import IsoFarmPixi from "../features/farm/IsoFarmPixi";
import logo from "../assets/logo.svg";
import "./GameLayout.css";

export default function GameLayout({ user, coinsBalance, setCoinsBalance, onLogout, onUserChanged }) {
  // Банк открывается из шапки (по балансу или кнопке), а рисуется на карте — рядом с её монетами
  const [bankOpen, setBankOpen] = useState(false);
  const openBank = () => setBankOpen(true);
  return (
    <div className="game-root">
      <header className="game-header">
        <img src={logo} alt="Farmotoria" className="game-logo" />
        <div className="game-header-right">
          <button className="game-coins" title="Монеты — открыть Банк" onClick={openBank}>
            💰 {coinsBalance.toLocaleString("ru-RU")}
          </button>
          <button className="game-coins diamonds" title="Алмазы — открыть Банк" onClick={openBank}>
            💎 {(user?.diamonds_balance ?? 0).toLocaleString("ru-RU")}
          </button>
          <button className="game-bank" title="Банк: обмен валют и кредит" onClick={openBank}>🏦<span className="game-bank-label"> Банк</span></button>
          {user && <span className="game-username">{user.username}</span>}
          <button className="game-logout" onClick={onLogout}>Выход</button>
        </div>
      </header>
      <main className="game-main">
        <IsoFarmPixi
          setCoinsBalance={setCoinsBalance}
          user={user}
          onUserChanged={onUserChanged}
          bankOpen={bankOpen}
          onBankClose={() => setBankOpen(false)}
        />
      </main>
    </div>
  );
}
