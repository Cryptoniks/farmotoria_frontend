// Игровая страница: узкая шапка и карта на всё оставшееся окно.
import IsoFarmPixi from "../features/farm/IsoFarmPixi";
import logo from "../assets/logo.svg";
import "./GameLayout.css";

export default function GameLayout({ user, coinsBalance, setCoinsBalance, onLogout, onUserChanged }) {
  return (
    <div className="game-root">
      <header className="game-header">
        <img src={logo} alt="Farmotoria" className="game-logo" />
        <div className="game-header-right">
          <span className="game-coins" title="Монеты">💰 {coinsBalance.toLocaleString("ru-RU")}</span>
          {user && <span className="game-username">{user.username}</span>}
          <button className="game-logout" onClick={onLogout}>Выход</button>
        </div>
      </header>
      <main className="game-main">
        <IsoFarmPixi setCoinsBalance={setCoinsBalance} user={user} onUserChanged={onUserChanged} />
      </main>
    </div>
  );
}
