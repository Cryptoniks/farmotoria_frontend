import { useCallback, useEffect, useState } from "react";
import { api } from "../../shared/services/api";
import PlantIcon from "../../components/PlantIcon";
import "./SeedSelectModal.css";
import "./FarmModals.css";

// Вкладки делят товары по флагам из API, а не по названию категории в БД
const TABS = [
  { id: "seeds", name: "🌱 Семена", match: (i) => i.is_seed },
  { id: "harvest", name: "🌾 Урожай", match: (i) => i.is_harvest },
  { id: "resources", name: "⚒️ Ресурсы", match: (i) => i.is_resource },
  { id: "products", name: "🏭 Продукты", match: (i) => !i.is_seed && !i.is_harvest && !i.is_resource },
];

const STORAGE_NAMES = { barn: "Сарай", warehouse: "Склад" };

/** Магазин: покупка любых товаров игры. Купленное ложится в Сарай или на Склад. */
export default function ShopModal({ isOpen, onClose, coins, onCoinsChange, onCustomize }) {
  const [items, setItems] = useState([]);
  const [storage, setStorage] = useState(null);
  const [tab, setTab] = useState("seeds");
  const [qty, setQty] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ text: "", error: false });

  const loadStorage = useCallback(() => {
    api.get("/api/storage/").then((res) => setStorage(res.data)).catch(() => setStorage(null));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStatus({ text: "", error: false });
    setLoading(true);
    api
      .get("/api/shop/items/")
      .then((res) => setItems(res.data))
      .catch(() => setStatus({ text: "Ошибка загрузки товаров", error: true }))
      .finally(() => setLoading(false));
    loadStorage();
  }, [isOpen, loadStorage]);

  if (!isOpen) return null;

  const current = TABS.find((t) => t.id === tab);
  const visible = items.filter(current.match);

  const handleBuy = async (item) => {
    const quantity = Number(qty[item.id] || 1);
    try {
      const res = await api.post("/api/shop/buy/", { item_id: item.id, quantity });
      onCoinsChange?.(res.data.coins_balance);
      setQty((prev) => ({ ...prev, [item.id]: 1 }));
      setStatus({ text: res.data.message || `✅ Куплено ×${quantity}`, error: false });
      loadStorage();
    } catch (e) {
      setStatus({ text: e?.response?.data?.detail || "Ошибка покупки", error: true });
    }
  };

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>🛒 Магазин</h2>
          <div className="seed-modal-header-actions">
            {onCustomize && <button className="customize-btn" onClick={onCustomize}>🎨 Внешний вид</button>}
            <button className="seed-modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="seed-modal-body">
          {storage && (
            <div className="farm-modal-storage-line">
              {Object.entries(storage).map(([kind, s]) => (
                <span key={kind}>
                  {STORAGE_NAMES[kind] || s.name}: свободно <b>{s.free}</b> из {s.capacity}
                </span>
              ))}
            </div>
          )}

          <div className="farm-modal-tabs">
            {TABS.map((t) => (
              <button key={t.id} className={`farm-modal-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                {t.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="farm-modal-empty">Загрузка...</div>
          ) : visible.length === 0 ? (
            <div className="farm-modal-empty">Нет товаров</div>
          ) : (
            <div className="farm-modal-list">
              {visible.map((item) => {
                const n = Number(qty[item.id] || 1);
                const total = item.buy_price * n;
                return (
                  <div key={item.id} className="farm-modal-row">
                    <PlantIcon plant={{ name: item.name, slug: item.slug }} size={32} />
                    <div>
                      <div className="farm-modal-name">{item.name}</div>
                      <div className="farm-modal-sub">
                        💰 {item.buy_price} за шт. • {STORAGE_NAMES[item.storage] || "Склад"}
                      </div>
                    </div>
                    <input
                      className="farm-modal-qty"
                      type="number"
                      min="1"
                      max="999"
                      value={qty[item.id] ?? 1}
                      onChange={(e) => setQty((prev) => ({ ...prev, [item.id]: Math.max(1, Number(e.target.value) || 1) }))}
                    />
                    <button className="farm-modal-btn" onClick={() => handleBuy(item)} disabled={coins < total}>
                      Купить за 💰 {total}
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
