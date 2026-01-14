// src/components/LeftMenu.jsx
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/LeftMenu.css";

export default function LeftMenu() {
  const location = useLocation();
  const [farmOpen, setFarmOpen] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith("/farm/")) {
      setFarmOpen(true);
    }
  }, [location.pathname]);

  return (
    <nav className="left-menu-nav">
      <h3>Игровое меню</h3>
      <ul className="left-menu">
        <li>
          <Link to="/profile">Профиль</Link>
        </li>
        <li>
          <button
            type="button"
            className="left-menu-toggle"
            onClick={() => setFarmOpen((prev) => !prev)}
          >
            Ферма
          </button>
          {farmOpen && (
            <ul className="left-menu-sub">
              <li>
                <Link to="/farm/field">Фермерское поле</Link>
              </li>
              <li>
                <Link to="/farm/animals">Животноводство</Link>
              </li>
            </ul>
          )}
        </li>

        <li>
          <Link to="/inventory">Инвентарь</Link>
        </li>
        <li>
          <Link to="/shop/seeds">Магазин семян</Link>
        </li>
        <li>
          <Link to="/market">Рынок</Link>
        </li>
      </ul>
    </nav>
  );
}