import { useEffect, useState, useMemo } from "react";
import { api } from "../../shared/services/api";
import { useNavigate } from "react-router-dom";
import "../../styles/MarketPage.css";
import PlantIcon from "../../components/PlantIcon";

const TABS = [
  { id: "all", name: "📦 Все товары" },
  { id: "harvest", name: "🌾 Сельхозпродукция" },
  { id: "resource", name: "⚒️ Ресурсы" },
  { id: "product", name: "🏭 Продукты" },
];

function MarketPage({ setCoinsBalance }) {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [status, setStatus] = useState("");
  const [sellQty, setSellQty] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const access = localStorage.getItem("access");
    if (!access) {
      navigate("/login");
      return;
    }

    api
      .get("/api/market/inventory/", {
        headers: { Authorization: `Bearer ${access}` },
      })
      .then((res) => {
        console.log("🛒 MARKET:", res.data);
        setItems(res.data);
      })
      .catch((err) => {
        console.error(err);
        setStatus("Ошибка загрузки рынка");
      });
  }, [navigate]);

  // Фильтрация и сортировка
  const filteredItems = useMemo(() => {
    let filtered = items;
    
    // Фильтр по категории
    if (activeTab !== "all") {
      filtered = items.filter(item => item.item_type === activeTab);
    }
    
    // Сортировка: сначала по типу (harvest -> resource -> product), потом по алфавиту
    const typeOrder = { harvest: 1, resource: 2, product: 3 };
    
    return [...filtered].sort((a, b) => {
      const typeA = typeOrder[a.item_type] || 4;
      const typeB = typeOrder[b.item_type] || 4;
      if (typeA !== typeB) return typeA - typeB;
      return a.name.localeCompare(b.name);
    });
  }, [items, activeTab]);

  const handleSell = async (itemId) => {
    const access = localStorage.getItem("access");
    const quantity = parseInt(sellQty[itemId], 10);

    if (isNaN(quantity) || quantity <= 0) {
      setStatus("Введите количество для продажи");
      return;
    }

    const item = items.find((it) => it.id === itemId);
    if (quantity > item.quantity) {
      setStatus(`Максимум ${item.quantity}`);
      return;
    }

    try {
      const res = await api.post(
        "/api/market/sell/",
        { item_id: itemId, quantity },
        { headers: { Authorization: `Bearer ${access}` } }
      );

      setCoinsBalance?.(res.data.coins_balance);
      
      // Обновляем количество локально
      setItems(prev => prev.map(it => 
        it.id === itemId 
          ? { ...it, quantity: it.quantity - quantity }
          : it
      ));
      
      setSellQty((prev) => ({ ...prev, [itemId]: "" }));
      setStatus(`✅ Продано ×${quantity} за ${quantity * item.sell_price_coins} монет`);
    } catch (err) {
      setStatus(err.response?.data?.detail || "Ошибка продажи");
    }
  };

  // Подсчет статистики
  const stats = useMemo(() => {
    const total = items.reduce((sum, item) => sum + (item.quantity > 0 ? 1 : 0), 0);
    const harvest = items.filter(i => i.item_type === "harvest" && i.quantity > 0).length;
    const resource = items.filter(i => i.item_type === "resource" && i.quantity > 0).length;
    const product = items.filter(i => i.item_type === "product" && i.quantity > 0).length;
    return { total, harvest, resource, product };
  }, [items]);

  return (
    <div className="market-page">
      <h2>🛒 Рынок</h2>

      {/* Вкладки категорий */}
      <div className="shop-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "tab-active" : "tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Статистика */}
      <div style={{ marginBottom: 16, fontSize: 14, color: "#888" }}>
        Всего товаров: {stats.total} | 
        Сельхозпродукция: {stats.harvest} | 
        Ресурсы: {stats.resource} | 
        Продукты: {stats.product}
      </div>

      {filteredItems.length === 0 ? (
        <p>Нет товаров для продажи</p>
      ) : (
        <table className="market-table">
          <thead>
            <tr>
              <th>Товар</th>
              <th>Тип</th>
              <th>Цена</th>
              <th>В наличии</th>
              <th>Продать</th>
              <th>Сумма</th>
              <th>Действие</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const plant = {
                name: item.name,
                slug: item.item_slug || item.name.toLowerCase().replace(" ", "-")
              };
              const qty = parseInt(sellQty[item.id] || "0");
              const total = qty * item.sell_price_coins;
              const hasStock = item.quantity > 0;

              return (
                <tr key={item.id} style={{ opacity: hasStock ? 1 : 0.5 }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <PlantIcon plant={plant} size={32} />
                      <div>
                        <strong>{item.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      color: item.item_type === "harvest" ? "#4caf50" : 
                             item.item_type === "resource" ? "#ff9800" : "#2196f3" 
                    }}>
                      {item.item_type === "harvest" ? "🌾" : 
                       item.item_type === "resource" ? "⚒️" : "🏭"}
                    </span>
                  </td>
                  <td>{item.sell_price_coins}₽</td>
                  <td>
                    <strong style={{ color: hasStock ? "#10b981" : "#f44336" }}>
                      {item.quantity}
                    </strong>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={sellQty[item.id] || ""}
                        onChange={(e) => setSellQty(prev => ({
                          ...prev, 
                          [item.id]: e.target.value
                        }))}
                        style={{ width: 70, padding: 4 }}
                        placeholder="0"
                        disabled={!hasStock}
                      />
                      <button
                        type="button"
                        onClick={() => setSellQty(prev => ({
                          ...prev, 
                          [item.id]: item.quantity
                        }))}
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        disabled={!hasStock}
                      >
                        Макс
                      </button>
                    </div>
                  </td>
                  <td style={{ fontWeight: "bold", color: "#10b981" }}>
                    {qty ? `${total}₽` : "—"}
                  </td>
                  <td>
                    <button 
                      onClick={() => handleSell(item.id)}
                      disabled={!qty || qty > item.quantity || !hasStock}
                      className="sell-btn"
                    >
                      Продать ×{qty || 0}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {status && (
        <div className={`market-status ${status.includes("✅") ? "success" : "error"}`}>
          {status}
        </div>
      )}
    </div>
  );
}

export default MarketPage;
