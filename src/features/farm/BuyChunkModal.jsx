import { useEffect, useState } from "react";
import "./SeedSelectModal.css";
import "./FarmModals.css";
import { useT } from "../../i18n/context";

/**
 * Покупка участка земли. За монеты — в пределах лимита по уровню (уровень × 1, с Премиумом × 2),
 * сверх него — один участок на уровень за алмазы.
 */
export default function BuyChunkModal({ chunk, coins, diamonds, expansion, chunkSize, onBuy, onRefresh, onClose }) {
  const t = useT();
  const fmt = t.num;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Лимиты могли измениться (новый уровень, Премиум) — перечитываем при открытии
  useEffect(() => {
    if (chunk) {
      setError("");
      onRefresh?.();
    }
  }, [chunk, onRefresh]);

  if (!chunk) return null;

  const buy = async (currency) => {
    setBusy(true);
    setError("");
    const res = await onBuy(chunk.chunk_row, chunk.chunk_col, currency);
    setBusy(false);
    if (res?.error) setError(res.error);
    else onClose();
  };

  const x = expansion;
  const nextLevel = (x?.level ?? 1) + 1;
  const coinsReason = !x ? "" : x.coin_slots_left <= 0
    ? t("chunk.coinLimitReached", { level: x.level, next: nextLevel })
    : coins < chunk.cost ? t("chunk.needCoins", { amount: fmt(chunk.cost - coins) }) : "";
  const diamondReason = !x ? "" : x.diamond_slots_left <= 0
    ? t("chunk.diamondLimitReached", { next: nextLevel })
    : diamonds < x.diamond_price ? t("chunk.needDiamonds", { amount: fmt(x.diamond_price - diamonds) }) : "";

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>{t("chunk.title")}</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="seed-modal-body">
          <div className="confirm-text">{t("chunk.question", { size: chunkSize })}</div>
          {x && (
            <div className="farm-modal-sub" style={{ marginTop: 6 }}>
              {t("chunk.limit", {
                level: x.level, perLevel: x.per_level, bought: x.coin_bought, limit: x.coin_limit,
                premium: t(x.is_premium ? "chunk.withPremium" : "chunk.premiumHint"),
              })}
            </div>
          )}

          <div className="chunk-option">
            <div>
              <div className="farm-modal-name">{t("chunk.coins", { cost: fmt(chunk.cost) })}</div>
              <div className="farm-modal-sub">
                {x ? t("chunk.coinsLeft", { left: x.coin_slots_left }) : ""} · {t("chunk.youHaveCoins", { coins: fmt(coins) })}
              </div>
              {coinsReason && <div className="academy-hint">🔒 {coinsReason}</div>}
            </div>
            <button className="farm-modal-btn" disabled={busy || Boolean(coinsReason) || !x} onClick={() => buy("coins")} autoFocus>
              {t("common.buy")}
            </button>
          </div>

          {x && (
            <div className="chunk-option diamonds">
              <div>
                <div className="farm-modal-name">{t("chunk.diamonds", { price: x.diamond_price })}</div>
                <div className="farm-modal-sub">
                  {t("chunk.diamondsNote", { left: x.diamond_slots_left, diamonds: fmt(diamonds) })}
                </div>
                {diamondReason && <div className="academy-hint">🔒 {diamondReason}</div>}
              </div>
              <button className="farm-modal-btn premium" disabled={busy || Boolean(diamondReason)} onClick={() => buy("diamonds")}>
                {t("common.buy")}
              </button>
            </div>
          )}

          {error && <div className="farm-modal-error">{error}</div>}
          <div className="confirm-actions">
            <button className="farm-modal-btn ghost" onClick={onClose}>{t("common.cancel")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
