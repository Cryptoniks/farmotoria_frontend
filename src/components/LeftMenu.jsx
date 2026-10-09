// src/components/LeftMenu.jsx
import { Link } from "react-router-dom";
import "../styles/LeftMenu.css";

export default function LeftMenu() {
  return (
    <nav className="left-menu-nav">
      <h3>Игровое меню</h3>
      <ul className="left-menu">
        <li>
          <Link to="/profile">Профиль</Link>
        </li>

        <li>
          <Link to="/farm">Ферма</Link>
        </li>

        <li>
          <Link to="/inventory">Инвентарь</Link>
        </li>

        <li>
          <Link to="/shop/seeds">Магазин</Link>
        </li>

        <li>
          <Link to="/market">Рынок</Link>
        </li>
      </ul>
    </nav>
  );
}