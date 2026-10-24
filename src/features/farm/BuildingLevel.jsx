import { useState } from "react";
import "./FarmModals.css";

const pct = (v) => `${Math.round((v || 0) * 100)}%`;

// Что даёт уровень — по типу здания (формулы и коэффициенты на бэкенде, BuildingType в админке)
function bonusLines(b, next) {
  const y = next ? b.next_yield_bonus : b.yield_bonus;
  const s = next ? b.next_speed_bonus : b.speed_bonus;
  if (b.building_type === "storage") {
    return [`Вместимость: ${next ? b.next_capacity : b.capacity}`];
  }
  const lines = [];
  if (y) lines.push(`Продукция: +${pct(y)}`);
  if (s) lines.push(`Скорость: −${pct(s)} времени`);
  return lines;
}

/** Уровень здания, его бонусы и кнопка улучшения. Для Магазина и Рынка не показывается. */
export default function BuildingLevel({ building, coins, onUpgrade }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!building || building.level == null || ["shop", "market"].includes(building.building_type)) return null;

  const isMax = building.level >= building.max_level;
  const busyReason = building.busy_reason;
  const upgrading = Boolean(building.upgrade_finishes_at);
  const price = building.upgrade_price;
  const current = bonusLines(building, false);
  const next = !isMax && !upgrading ? bonusLines(building, true) : [];

  const handleUpgrade = async () => {
    setBusy(true);
    setError("");
    const res = await onUpgrade?.(building.id);
    if (res?.error) setError(res.error);
    setBusy(false);
  };

  return (
    <div className="building-level">
      <div className="building-level-head">
        <span className="building-level-badge">Ур. {building.level}</span>
        <span className="building-level-max">из {building.max_level}</span>
      </div>

      {(current.length > 0 || next.length > 0) && (
        <div className="building-level-bonuses">
          {current.length > 0 && <div>Сейчас: {current.join(" • ")}</div>}
          {next.length > 0 && <div className="building-level-next">Ур. {building.level + 1}: {next.join(" • ")}</div>}
        </div>
      )}

      {upgrading && (
        <div className="building-level-note">
          Улучшается до {new Date(building.upgrade_finishes_at).toLocaleTimeString()}
        </div>
      )}
      {isMax && <div className="building-level-note">Максимальный уровень</div>}

      {!isMax && !upgrading && price != null && (
        <button
          className="upgrade-btn"
          onClick={handleUpgrade}
          disabled={busy || Boolean(busyReason) || coins < price}
          title={busyReason || (coins < price ? "Недостаточно монет" : undefined)}
        >
          ⬆ Улучшить за 💰 {price}
        </button>
      )}
      {!isMax && !upgrading && price != null && busyReason && (
        <div className="building-level-note">🔒 Улучшение недоступно: {busyReason.charAt(0).toLowerCase() + busyReason.slice(1)}</div>
      )}
      {error && <div className="farm-modal-error">{error}</div>}
    </div>
  );
}
