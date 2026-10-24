import { useState } from "react";
import "./FarmModals.css";
import { useT } from "../../i18n/context";

const pct = (v) => `${Math.round((v || 0) * 100)}%`;

// Что даёт уровень — по типу здания (формулы и коэффициенты на бэкенде, BuildingType в админке)
function bonusLines(t, b, next) {
  const y = next ? b.next_yield_bonus : b.yield_bonus;
  const s = next ? b.next_speed_bonus : b.speed_bonus;
  if (b.building_type === "storage") {
    return [t("level.capacity", { value: next ? b.next_capacity : b.capacity })];
  }
  const lines = [];
  if (y) lines.push(t("level.yield", { value: pct(y) }));
  if (s) lines.push(t("level.speed", { value: pct(s) }));
  return lines;
}

/** Уровень здания, его бонусы и кнопка улучшения. Для Магазина и Рынка не показывается. */
export default function BuildingLevel({ building, coins, onUpgrade }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!building || building.level == null || ["shop", "market"].includes(building.building_type)) return null;

  const isMax = building.level >= building.max_level;
  const busyReason = building.busy_reason;
  const upgrading = Boolean(building.upgrade_finishes_at);
  const price = building.upgrade_price;
  const current = bonusLines(t, building, false);
  const next = !isMax && !upgrading ? bonusLines(t, building, true) : [];

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
        <span className="building-level-badge">{t("level.badge", { level: building.level })}</span>
        <span className="building-level-max">{t("level.of", { max: building.max_level })}</span>
      </div>

      {(current.length > 0 || next.length > 0) && (
        <div className="building-level-bonuses">
          {current.length > 0 && <div>{t("level.now", { list: current.join(" • ") })}</div>}
          {next.length > 0 && <div className="building-level-next">{t("level.next", { level: building.level + 1, list: next.join(" • ") })}</div>}
        </div>
      )}

      {upgrading && (
        <div className="building-level-note">
          {t("level.upgradingUntil", { time: t.date(building.upgrade_finishes_at, { timeStyle: "short" }) })}
        </div>
      )}
      {isMax && <div className="building-level-note">{t("level.max")}</div>}

      {!isMax && !upgrading && price != null && (
        <button
          className="upgrade-btn"
          onClick={handleUpgrade}
          disabled={busy || Boolean(busyReason) || coins < price}
          title={busyReason ? t(busyReason) : coins < price ? t("level.noCoins") : undefined}
        >
          {t("level.upgrade", { price: t.num(price) })}
        </button>
      )}
      {!isMax && !upgrading && price != null && busyReason && (
        <div className="building-level-note">{t("level.locked", { reason: t(busyReason) })}</div>
      )}
      {error && <div className="farm-modal-error">{error}</div>}
    </div>
  );
}
