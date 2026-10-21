import { useEffect, useState } from "react";
import { api } from "../../shared/services/api";
import { useNavigate } from "react-router-dom";
import PlantIcon from "../../components/PlantIcon";
import "./SeedShopPage.css";

// Вкладки магазина. Товары делятся по флагам из API, а не по названию категории в БД.
const CATEGORIES = [
  { id: "seeds", name: "🌱 Семена", match: (item) => item.is_seed },
  { id: "harvest", name: "🌾 Сельхозпродукция", match: (item) => item.is_harvest },
  { id: "resources", name: "⚒️ Ресурсы", match: (item) => item.is_resource },
  { id: "products", name: "🏭 Продукты", match: (item) => !item.is_seed && !item.is_harvest && !item.is_resource },
];

function SeedShopPage({ setCoinsBalance }) {
  const [activeTab, setActiveTab] = useState("seeds");
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [quantities, setQuantities] = useState({});
  const navigate = useNavigate();

  // Весь каталог грузится один раз, вкладки фильтруют его на клиенте
  useEffect(() => {
    if (!localStorage.getItem("access")) {
      navigate("/login");
      return;
    }

    api
      .get("/api/shop/items/")
      .then((res) => setAllItems(res.data))
      .catch((err) => {
        console.error(err);
        setStatus("Ошибка загрузки товаров");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const category = CATEGORIES.find((cat) => cat.id === activeTab);
  const items = allItems.filter(category.match);
  const emptyText = status || "Нет доступных товаров для покупки";

  const handleBuy = async (itemId) => {
    const access = localStorage.getItem("access");
    const quantity = Number(quantities[itemId] || 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setStatus("Введите корректное количество");
      return;
    }

    try {
      const res = await api.post(
        "/api/shop/buy/",
        { item_id: itemId, quantity },
        { headers: { Authorization: `Bearer ${access}` } }
      );
      setCoinsBalance?.(res.data.coins_balance);
      setStatus(`✅ Куплено ×${quantity}`);
      setQuantities((prev) => ({ ...prev, [itemId]: 1 }));
    } catch (err) {
      setStatus(err.response?.data?.detail || "❌ Недостаточно монет");
    }
  };

  return (
    <div className="seed-shop">
      <h2>🛒 Магазин</h2>

      {/* Вкладки категорий */}
      <div className="shop-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={activeTab === cat.id ? "tab-active" : "tab"}
            onClick={() => setActiveTab(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Содержимое */}
      <div className="tab-content">
        {loading ? (
          <p>Загрузка товаров...</p>
        ) : items.length === 0 ? (
          <p>{emptyText}</p>
        ) : (
          <table className="seed-shop-table">
            <thead>
              <tr>
                <th>Иконка</th>
                <th>Название</th>
                <th>Описание</th>
                <th>Цена</th>
                <th>Количество</th>
                <th>Купить</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <PlantIcon 
                      plant={{ name: item.name, slug: item.slug }} 
                      size={40} 
                    />
                  </td>
                  <td>
                    <strong>{item.name}</strong>
                    <br />
                    <small>{item.category?.name}</small>
                  </td>
                  <td>{item.description || "—"}</td>
                  <td style={{ fontWeight: "bold", color: "#10b981" }}>
                    {item.buy_price}₽
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={quantities[item.id] ?? 1}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [item.id]: Math.max(1, Number(e.target.value)),
                        }))
                      }
                      style={{ width: 80, padding: "4px" }}
                    />
                  </td>
                  <td>
                    <button 
                      onClick={() => handleBuy(item.id)}
                      className="buy-btn"
                    >
                      Купить ×{quantities[item.id] ?? 1}<br />
                      <small>{item.buy_price * (quantities[item.id] ?? 1)}₽</small>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {status && !loading && (
        <div className={`seed-status ${status.includes("✅") ? "success" : "error"}`}>
          {status}
        </div>
      )}
    </div>
  );
}

export default SeedShopPage;