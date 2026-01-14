// src/components/Header.jsx
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";      // путь к картинке

export default function Header({ user, isAuthenticated, coinsBalance, onLogout }) {
  return (
    <header className="header">
      <div className="header-inner">
        {/* ЛЕВАЯ ЧАСТЬ: логотип + название */}
        <div className="header-left">
          <Link to="/" className="header-logo">
            <img src={logo} alt="Farmotoria" />
          </Link>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: пользователь / auth */}
        <div className="header-right">
          {!isAuthenticated && (
            <div className="header-auth">
              <Link to="/login" className="btn-link">Войти</Link>
              <Link to="/register" className="btn-link">Регистрация</Link>
            </div>
          )}

          {isAuthenticated && user && (
            <div className="header-user">
              <span className="header-username">{user.username}</span>
              <span className="header-coins">💰 {coinsBalance}</span>
              <button className="header-logout" onClick={onLogout}>
                Выход
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}