import { useEffect, useState } from "react";
import { api } from "../../shared/services/api";
import PlantIcon from "../../components/PlantIcon";
import BuildingLevel from "./BuildingLevel";
import "./SeedSelectModal.css";
import "./FarmModals.css";

const TITLES = { barn: "🏚 Сарай", warehouse: "📦 Склад" };
const HINTS = {
  barn: "Семена, урожай, корма и продукты животноводства",
  warehouse: "Ресурсы, продукты переработки и продукция",
};

/** Сарай / Склад: товары этого типа хранилища и общая заполненность всех таких зданий. */
export default function StorageModal({ building, onClose, coins, onUpgrade, onSell, onCustomize }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const kind = building?.storage;
  const level = building?.level;

  // Перезагружаем при открытии и после улучшения (меняется вместимость)
  useEffect(() => {
    if (!building) return;
    api
      .get("/api/storage/")
      .then((res) => setData(res.data))
      .catch(() => setError("Ошибка загрузки хранилища"));
  }, [building?.id, level]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!building) return null;

  const s = data?.[kind];
  const ratio = s && s.capacity ? s.used / s.capacity : 0;
  const fillClass = ratio >= 1 ? "full" : ratio >= 0.8 ? "warn" : "";

  const handleSell = async () => {
    if (!confirm(`Продать «${building.name}»? Вернётся ${building.price_paid} монет.`)) return;
    const res = await onSell?.(building.id);
    if (res?.error) setError(res.error);
    else onClose();
  };

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>{TITLES[kind] || building.name}</h2>
          <div className="seed-modal-header-actions">
            {onCustomize && <button className="customize-btn" onClick={onCustomize}>🎨 Внешний вид</button>}
            <button className="seed-modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="seed-modal-body">
          <div className="farm-modal-sub">{HINTS[kind]}</div>

          {s && (
            <>
              <div className="capacity-bar">
                <div className={`capacity-bar-fill ${fillClass}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
              </div>
              <div className="capacity-caption">
                <span>Занято <b>{s.used}</b> из {s.capacity}</span>
                <span>это здание: +{building.capacity}</span>
              </div>
              {ratio >= 1 && (
                <div className="farm-modal-error">
                  Места нет: новые товары сюда не попадут. Продайте часть на Рынке или улучшите здание.
                </div>
              )}

              {s.items.length === 0 ? (
                <div className="farm-modal-empty">Пусто</div>
              ) : (
                <div className="farm-modal-list">
                  {s.items.map((item) => (
                    <div key={item.item_id} className="farm-modal-row">
                      <PlantIcon plant={{ name: item.name, slug: item.slug }} size={32} />
                      <div>
                        <div className="farm-modal-name">{item.name}</div>
                        <div className="farm-modal-sub">{item.category} • на Рынке 💰 {item.sell_price} за шт.</div>
                      </div>
                      <b>×{item.quantity}</b>
                      <span />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {!s && !error && <div className="farm-modal-empty">Загрузка...</div>}
          {error && <div className="farm-modal-error">{error}</div>}

          <BuildingLevel building={building} coins={coins} onUpgrade={onUpgrade} />

          <div className="modal-footer">
            <button className="sell-btn" onClick={handleSell}>💰 Продать здание</button>
          </div>
        </div>
      </div>
    </div>
  );
}
