// src/components/RightPanel.jsx
import { Link } from "react-router-dom";

export default function RightPanel({ user }) {
  return (
    <div className="right-panel">
      {/* Блок 1 — приветствие */}
      <section className="rp-block">
        <h3>Приветствие</h3>
        {user ? (
          <p>Добро пожаловать на ферму, {user.username}!</p>
        ) : (
          <p>Войдите, чтобы начать игру.</p>
        )}
      </section>

      {/* Блок 2 — партнёры */}
      <section className="rp-block">
        <h3>Партнёры</h3>
        <ul>
          <li>
            <a href="https://example.com" target="_blank" rel="noreferrer">
              Наш спонсор №1
            </a>
          </li>
          <li>
            <a href="https://example.org" target="_blank" rel="noreferrer">
              Полезный ресурс
            </a>
          </li>
        </ul>
      </section>

      {/* Блок 3 — баннер */}
      <section className="rp-block rp-banner">
        <h3>Акция</h3>
        <p>Получите бонусные монеты за ежедневный вход!</p>
        <Link to="/market" className="rp-banner-btn">
          На рынок
        </Link>
      </section>
    </div>
  );
}