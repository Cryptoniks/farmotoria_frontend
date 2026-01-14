import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import "../styles/MarketPage.css";
import PlantIcon from "../components/PlantIcon";

function MarketPage({ setCoinsBalance }) {
  const [items, setItems] = useState([]);
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
        setItems(res.data.filter(item => item.quantity > 0));  // Только в наличии
      })
      .catch((err) => {
        console.error(err);
        setStatus("Ошибка загрузки рынка");
      });
  }, [navigate]);

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
      
      // ✅ Обновляем локально
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? { ...it, quantity: it.quantity - quantity }
            : it
        ).filter(item => item.quantity > 0)  // Удаляем 0
      );
      
      setSellQty((prev) => ({ ...prev, [itemId]: "" }));
      setStatus(`✅ Продано ×${quantity} за ${quantity * item.sell_price_coins} монет`);
    } catch (err) {
      setStatus(err.response?.data?.detail || "Ошибка продажи");
    }
  };

  if (items.length === 0) {
    return (
      <div className="market-page">
        <h2>🛒 Рынок</h2>
        <p>Нет товаров для продажи</p>
      </div>
    );
  }

  return (
    <div className="market-page">
      <h2>🛒 Рынок ({items.reduce((sum, item) => sum + item.quantity, 0)} товаров)</h2>

      <table className="market-table">
        <thead>
          <tr>
            <th>Товар</th>
            <th>Цена</th>
            <th>В наличии</th>
            <th>Продать</th>
            <th>Сумма</th>
            <th>Действие</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const plant = {
              name: item.name,
              slug: item.item_slug || item.name.toLowerCase().replace(" ", "-harvest")
            };
            const qty = parseInt(sellQty[item.id] || "0");
            const total = qty * item.sell_price_coins;

            return (
              <tr key={item.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PlantIcon plant={plant} size={32} />
                    <div>
                      <strong>{item.name}</strong>
                      <br />
                      <small>ID: {item.id}</small>
                    </div>
                  </div>
                </td>
                <td>{item.sell_price_coins}₽</td>
                <td><strong>{item.quantity}</strong></td>
                <td>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input
                      type="number"
                      min="1"
                      max={item.quantity}
                      value={sellQty[item.id] || ""}
                      onChange={(e) => setSellQty(prev => ({
                        ...prev, 
                        [item.id]: e.target.value
                      }))}
                      style={{ width: 70, padding: 4 }}
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setSellQty(prev => ({
                        ...prev, 
                        [item.id]: item.quantity
                      }))}
                      style={{ padding: "4px 8px", fontSize: 12 }}
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
                    disabled={!qty || qty > item.quantity}
                    className="sell-btn"
                  >
                    Продать ×{qty}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {status && (
        <div className={`market-status ${status.includes("✅") ? "success" : "error"}`}>
          {status}
        </div>
      )}
    </div>
  );
}

export default MarketPage;