// Игровая страница: узкая шапка и карта на всё оставшееся окно.
import { useState } from "react";
import IsoFarmPixi from "../features/farm/IsoFarmPixi";
import LanguageSwitcher from "../i18n/LanguageSwitcher";
import { useT } from "../i18n/context";
import logo from "../assets/logo.svg";
import "./GameLayout.css";

export default function GameLayout({ user, coinsBalance, setCoinsBalance, onLogout, onUserChanged, onLanguageChange }) {
  // Банк открывается из шапки (по балансу или кнопке), а рисуется на карте — рядом с её монетами
  const t = useT();
  const [bankOpen, setBankOpen] = useState(false);
  const openBank = () => setBankOpen(true);
  return (
    <div className="game-root">
      <header className="game-header">
        <img src={logo} alt="Farmotoria" className="game-logo" />
        <div className="game-header-right">
          <LanguageSwitcher onChange={onLanguageChange} />
          <button className="game-coins" title={t("header.coinsTitle")} onClick={openBank}>
            💰 {t.num(coinsBalance)}
          </button>
          <button className="game-coins diamonds" title={t("header.diamondsTitle")} onClick={openBank}>
            💎 {t.num(user?.diamonds_balance)}
          </button>
          <button className="game-bank" title={t("header.bankTitle")} onClick={openBank}>🏦<span className="game-bank-label"> {t("header.bank")}</span></button>
          {user && <span className="game-username">{user.username}</span>}
          <button className="game-logout" onClick={onLogout}>{t("header.logout")}</button>
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
