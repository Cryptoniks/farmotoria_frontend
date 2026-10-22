import { useEffect, useMemo, useState } from "react";
import { api } from "../../shared/services/api";
import PlantIcon from "../../components/PlantIcon";
import "./SeedSelectModal.css";
import "./FarmModals.css";

const TABS = [
  { id: "all", name: "📦 Все" },
  { id: "harvest", name: "🌾 Урожай" },
  { id: "resource", name: "⚒️ Ресурсы" },
  { id: "product", name: "🏭 Продукты" },
];

/** Рынок: все товары игры (кроме семян) с количеством у игрока и продажей. */
export default function MarketModal({ isOpen, onClose, onCoinsChange }) {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("all");
  const [qty, setQty] = useState({});
  const [onlyStock, setOnlyStock] = useState(true);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ text: "", error: false });

  useEffect(() => {
    if (!isOpen) return;
    setStatus({ text: "", error: false });
    setLoading(true);
    api
      .get("/api/market/inventory/")
      .then((res) => setItems(res.data))
      .catch(() => setStatus({ text: "Ошибка загрузки рынка", error: true }))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const visible = useMemo(() => {
    const order = { harvest: 1, resource: 2, product: 3 };
    return items
      .filter((i) => tab === "all" || i.item_type === tab)
      .filter((i) => !onlyStock || i.quantity > 0)
      .sort((a, b) => (b.quantity > 0) - (a.quantity > 0) || order[a.item_type] - order[b.item_type] || a.name.localeCompare(b.name));
  }, [items, tab, onlyStock]);

  if (!isOpen) return null;

  const handleSell = async (item) => {
    const quantity = Number(qty[item.id] || 0);
    if (!quantity || quantity > item.quantity) return;
    try {
      const res = await api.post("/api/market/sell/", { item_id: item.id, quantity });
      onCoinsChange?.(res.data.coins_balance);
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, quantity: it.quantity - quantity } : it)));
      setQty((prev) => ({ ...prev, [item.id]: "" }));
      setStatus({ text: `✅ ${res.data.message || `Продано ×${quantity}`}`, error: false });
    } catch (e) {
      setStatus({ text: e?.response?.data?.detail || "Ошибка продажи", error: true });
    }
  };

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>⚖️ Рынок</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          <div className="farm-modal-tabs">
            {TABS.map((t) => (
              <button key={t.id} className={`farm-modal-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                {t.name}
              </button>
            ))}
            <button className={`farm-modal-tab ${onlyStock ? "active" : ""}`} onClick={() => setOnlyStock((v) => !v)}>
              {onlyStock ? "✔ Только в наличии" : "Показать все товары"}
            </button>
          </div>

          {loading ? (
            <div className="farm-modal-empty">Загрузка...</div>
          ) : visible.length === 0 ? (
            <div className="farm-modal-empty">
              {onlyStock ? "Нечего продавать: соберите урожай, запустите добычу или переработку" : "Нет товаров"}
            </div>
          ) : (
            <div className="farm-modal-list">
              {visible.map((item) => {
                const n = Number(qty[item.id] || 0);
                const hasStock = item.quantity > 0;
                return (
                  <div key={item.id} className={`farm-modal-row ${hasStock ? "" : "empty"}`}>
                    <PlantIcon plant={{ name: item.name, slug: item.item_slug }} size={32} />
                    <div>
                      <div className="farm-modal-name">{item.name}</div>
                      <div className="farm-modal-sub">
                        В наличии: <b>{item.quantity}</b> • 💰 {item.sell_price_coins} за шт.
                      </div>
                    </div>
                    <div className="farm-modal-actions">
                      <input
                        className="farm-modal-qty"
                        type="number"
                        min="0"
                        max={item.quantity}
                        placeholder="0"
                        value={qty[item.id] ?? ""}
                        disabled={!hasStock}
                        onChange={(e) => setQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                      <button
                        className="farm-modal-btn ghost"
                        disabled={!hasStock}
                        onClick={() => setQty((prev) => ({ ...prev, [item.id]: item.quantity }))}
                      >
                        Все
                      </button>
                    </div>
                    <button
                      className="farm-modal-btn sell"
                      disabled={!n || n > item.quantity}
                      onClick={() => handleSell(item)}
                    >
                      Продать{n ? ` за 💰 ${n * item.sell_price_coins}` : ""}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {status.text && <div className={`farm-modal-status ${status.error ? "error" : ""}`}>{status.text}</div>}
        </div>
      </div>
    </div>
  );
}
