import { useState } from "react";
import "./SeedSelectModal.css";
import "./FarmModals.css";

/** Подтверждение покупки участка земли: цена, баланс до и после, «Купить» / «Отмена». */
export default function BuyChunkModal({ chunk, coins, chunkSize, onBuy, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!chunk) return null;

  const enough = coins >= chunk.cost;
  const buy = async () => {
    setBusy(true);
    setError("");
    const res = await onBuy(chunk.chunk_row, chunk.chunk_col);
    setBusy(false);
    if (res?.error) setError(res.error);
    else onClose();
  };

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>🗺️ Новый участок</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="seed-modal-body">
          <div className="confirm-text">
            Купить участок {chunkSize}×{chunkSize} клеток и расширить ферму?
          </div>
          <div className="confirm-prices">
            <span>Цена: <b>💰 {chunk.cost.toLocaleString("ru-RU")}</b></span>
            <span>У вас: 💰 {coins.toLocaleString("ru-RU")}</span>
            {enough && <span>Останется: 💰 {(coins - chunk.cost).toLocaleString("ru-RU")}</span>}
          </div>
          {!enough && (
            <div className="farm-modal-error">
              Недостаточно монет: не хватает 💰 {(chunk.cost - coins).toLocaleString("ru-RU")}
            </div>
          )}
          {error && <div className="farm-modal-error">{error}</div>}
          <div className="confirm-actions">
            <button className="farm-modal-btn ghost" onClick={onClose}>Отмена</button>
            {enough && (
              <button className="farm-modal-btn" onClick={buy} disabled={busy} autoFocus>
                {busy ? "..." : "Купить"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
