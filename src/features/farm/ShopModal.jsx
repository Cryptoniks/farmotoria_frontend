import { useCallback, useEffect, useState } from "react";
import { useT } from "../../i18n/context";
import { api } from "../../shared/services/api";
import PlantIcon from "../../components/PlantIcon";
import "./SeedSelectModal.css";
import "./FarmModals.css";

// Вкладки делят товары по флагам из API, а не по названию категории в БД
const TABS = [
  { id: "seeds", match: (i) => i.is_seed },
  { id: "harvest", match: (i) => i.is_harvest },
  { id: "resources", match: (i) => i.is_resource },
  { id: "products", match: (i) => !i.is_seed && !i.is_harvest && !i.is_resource },
];

const STORAGE_KEYS = { barn: "storage.barn", warehouse: "storage.warehouse" };

/** Магазин: покупка любых товаров игры. Купленное ложится в Сарай или на Склад. */
export default function ShopModal({ isOpen, onClose, coins, onCoinsChange, onCustomize }) {
  const t = useT();
  const storageName = (kind) => t(STORAGE_KEYS[kind] || "storage.warehouse");
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
      .catch(() => setStatus({ text: t("shop.loadError"), error: true }))
      .finally(() => setLoading(false));
    loadStorage();
  }, [isOpen, loadStorage, t]);

  if (!isOpen) return null;

  const current = TABS.find((tb) => tb.id === tab);
  const visible = items.filter(current.match);

  const handleBuy = async (item) => {
    const quantity = Number(qty[item.id] || 1);
    try {
      const res = await api.post("/api/shop/buy/", { item_id: item.id, quantity });
      onCoinsChange?.(res.data.coins_balance);
      setQty((prev) => ({ ...prev, [item.id]: 1 }));
      setStatus({ text: res.data.message || t("shop.bought", { count: quantity }), error: false });
      loadStorage();
    } catch (e) {
      setStatus({ text: e?.response?.data?.detail || t("shop.buyError"), error: true });
    }
  };

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>{t("shop.title")}</h2>
          <div className="seed-modal-header-actions">
            {onCustomize && <button className="customize-btn" onClick={onCustomize}>{t("common.appearance")}</button>}
            <button className="seed-modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="seed-modal-body">
          {storage && (
            <div className="farm-modal-storage-line">
              {Object.entries(storage).map(([kind, s]) => (
                <span key={kind}>
                  {t("shop.free", { storage: STORAGE_KEYS[kind] ? storageName(kind) : s.name })} <b>{s.free}</b> {t("shop.of", { capacity: s.capacity })}
                </span>
              ))}
            </div>
          )}

          <div className="farm-modal-tabs">
            {TABS.map((tb) => (
              <button key={tb.id} className={`farm-modal-tab ${tab === tb.id ? "active" : ""}`} onClick={() => setTab(tb.id)}>
                {t(`shop.tab.${tb.id}`)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="farm-modal-empty">{t("common.loading")}</div>
          ) : visible.length === 0 ? (
            <div className="farm-modal-empty">{t("shop.noItems")}</div>
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
                        {t("shop.perItem", { price: item.buy_price, storage: storageName(item.storage) })}
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
                      {t("shop.buyFor", { total })}
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
