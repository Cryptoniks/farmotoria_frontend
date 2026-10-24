import { useEffect, useState } from "react";
import "./SeedSelectModal.css";
import "./FarmModals.css";

const fmt = (n) => (n ?? 0).toLocaleString("ru-RU");

/**
 * Покупка участка земли. За монеты — в пределах лимита по уровню (уровень × 1, с Премиумом × 2),
 * сверх него — один участок на уровень за алмазы.
 */
export default function BuyChunkModal({ chunk, coins, diamonds, expansion, chunkSize, onBuy, onRefresh, onClose }) {
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
    ? `Лимит на ${x.level}-м уровне исчерпан — следующий участок за монеты на ${nextLevel}-м уровне`
    : coins < chunk.cost ? `Не хватает 💰 ${fmt(chunk.cost - coins)}` : "";
  const diamondReason = !x ? "" : x.diamond_slots_left <= 0
    ? `За алмазы — один участок на уровень; следующий на ${nextLevel}-м уровне`
    : diamonds < x.diamond_price ? `Не хватает 💎 ${fmt(x.diamond_price - diamonds)} — алмазы есть в Банке` : "";

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>🗺️ Новый участок</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="seed-modal-body">
          <div className="confirm-text">Купить участок {chunkSize}×{chunkSize} клеток и расширить ферму?</div>
          {x && (
            <div className="farm-modal-sub" style={{ marginTop: 6 }}>
              Уровень {x.level}: за монеты — по {x.per_level} участ{x.per_level === 1 ? "ку" : "ка"} на уровень
              {x.is_premium ? " (👑 Премиум)" : " (с Премиумом — по 2)"}, куплено {x.coin_bought} из {x.coin_limit}.
            </div>
          )}

          <div className="chunk-option">
            <div>
              <div className="farm-modal-name">💰 За монеты: {fmt(chunk.cost)}</div>
              <div className="farm-modal-sub">
                {x ? `Можно ещё ${x.coin_slots_left} на этом уровне` : ""} · у вас 💰 {fmt(coins)}
              </div>
              {coinsReason && <div className="academy-hint">🔒 {coinsReason}</div>}
            </div>
            <button className="farm-modal-btn" disabled={busy || Boolean(coinsReason) || !x} onClick={() => buy("coins")} autoFocus>
              Купить
            </button>
          </div>

          {x && (
            <div className="chunk-option diamonds">
              <div>
                <div className="farm-modal-name">💎 За алмазы: {x.diamond_price}</div>
                <div className="farm-modal-sub">
                  Сверх лимита, монеты не тратятся · ещё {x.diamond_slots_left} на этом уровне · у вас 💎 {fmt(diamonds)}
                </div>
                {diamondReason && <div className="academy-hint">🔒 {diamondReason}</div>}
              </div>
              <button className="farm-modal-btn premium" disabled={busy || Boolean(diamondReason)} onClick={() => buy("diamonds")}>
                Купить
              </button>
            </div>
          )}

          {error && <div className="farm-modal-error">{error}</div>}
          <div className="confirm-actions">
            <button className="farm-modal-btn ghost" onClick={onClose}>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  );
}
