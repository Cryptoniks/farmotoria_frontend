import { useEffect, useMemo, useState } from "react";
import { useT } from "../../i18n/context";
import { api } from "../../shared/services/api";
import PlantIcon from "../../components/PlantIcon";
import "./SeedSelectModal.css";
import "./FarmModals.css";

const TABS = [
  { id: "all" },
  { id: "harvest" },
  { id: "resource" },
  { id: "product" },
];

/** Рынок: все товары игры (кроме семян) с количеством у игрока и продажей. */
export default function MarketModal({ isOpen, onClose, onCoinsChange, onCustomize }) {
  const t = useT();
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
      .catch(() => setStatus({ text: t("market.loadError"), error: true }))
      .finally(() => setLoading(false));
  }, [isOpen, t]);

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
      setStatus({ text: `✅ ${res.data.message || t("market.sold", { count: quantity })}`, error: false });
    } catch (e) {
      setStatus({ text: e?.response?.data?.detail || t("market.sellError"), error: true });
    }
  };

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>{t("market.title")}</h2>
          <div className="seed-modal-header-actions">
            {onCustomize && <button className="customize-btn" onClick={onCustomize}>{t("common.appearance")}</button>}
            <button className="seed-modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="seed-modal-body">
          <div className="farm-modal-tabs">
            {TABS.map((tb) => (
              <button key={tb.id} className={`farm-modal-tab ${tab === tb.id ? "active" : ""}`} onClick={() => setTab(tb.id)}>
                {t(`market.tab.${tb.id}`)}
              </button>
            ))}
            <button className={`farm-modal-tab ${onlyStock ? "active" : ""}`} onClick={() => setOnlyStock((v) => !v)}>
              {onlyStock ? t("market.onlyStock") : t("market.showAll")}
            </button>
          </div>

          {loading ? (
            <div className="farm-modal-empty">{t("common.loading")}</div>
          ) : visible.length === 0 ? (
            <div className="farm-modal-empty">
              {onlyStock ? t("market.nothingToSell") : t("shop.noItems")}
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
                        {t("market.inStock")} <b>{item.quantity}</b> • {t("market.perItem", { price: item.sell_price_coins })}
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
                        {t("market.all")}
                      </button>
                    </div>
                    <button
                      className="farm-modal-btn sell"
                      disabled={!n || n > item.quantity}
                      onClick={() => handleSell(item)}
                    >
                      {n ? t("market.sellFor", { total: n * item.sell_price_coins }) : t("market.sell")}
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
