import { useMemo, useState } from "react";
import {
  APPEARANCE_GROUPS,
  isDefaultAppearance,
  renderBuildingSvg,
  rerollAppearance,
  sameAppearance,
  svgToDataUrl,
} from "./buildingArt";
import "./SeedSelectModal.css";
import "./FarmModals.css";

const preview = (slug, look) => svgToDataUrl(renderBuildingSvg(slug, isDefaultAppearance(look) ? null : look));

/**
 * Смена внешнего вида типа здания. Варианты генерируются в браузере бесплатно и сколько угодно;
 * монеты списываются один раз — при сохранении. Вид действует на все здания этого типа у игрока.
 */
export default function AppearanceModal({ target, saved, coins, price, onSave, onReset, onClose }) {
  const [draft, setDraft] = useState(saved || null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });

  const slug = target?.slug;
  const draftUrl = useMemo(() => (slug ? preview(slug, draft) : null), [slug, draft]);
  const savedUrl = useMemo(() => (slug ? preview(slug, saved) : null), [slug, saved]);

  if (!target) return null;

  const changed = !sameAppearance(draft, saved);
  const isDefaultDraft = isDefaultAppearance(draft);
  const canSave = changed && !isDefaultDraft && coins >= price && !busy;

  const run = async (action, okText) => {
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (res?.error) setStatus({ text: res.error, error: true });
    else setStatus({ text: okText, error: false });
  };

  const handleSave = () => run(() => onSave(slug, draft), `✅ Новый вид сохранён для всех зданий «${target.name}»`);

  const handleReset = () => {
    if (!confirm(`Вернуть всем зданиям «${target.name}» исходный вид? Это бесплатно.`)) return;
    run(async () => {
      const res = await onReset(slug);
      if (!res?.error) setDraft(null);
      return res;
    }, "✅ Возвращён исходный вид");
  };

  return (
    <div className="seed-modal-overlay appearance-overlay" onClick={onClose}>
      <div className="seed-modal-content appearance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>🎨 Внешний вид: {target.name}</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          <div className="appearance-stage">
            <img src={draftUrl} alt={target.name} />
            {changed && <span className="appearance-badge">Новый вариант</span>}
          </div>

          <div className="appearance-reroll">
            <button className="farm-modal-btn" onClick={() => setDraft(rerollAppearance(draft))} disabled={busy}>
              🎲 Всё новое
            </button>
            {APPEARANCE_GROUPS.map((g) => (
              <button key={g.key} className="farm-modal-btn ghost" onClick={() => setDraft(rerollAppearance(draft, g.key))} disabled={busy}>
                {g.icon} {g.label}
              </button>
            ))}
          </div>

          <div className="appearance-current">
            <img src={savedUrl} alt="Сейчас" />
            <div>
              <div className="farm-modal-name">Сейчас</div>
              <div className="farm-modal-sub">{saved ? "Свой вид" : "Исходный вид"}</div>
              {changed && (
                <button className="farm-modal-btn ghost" onClick={() => setDraft(saved || null)} disabled={busy}>
                  ↩ Вернуть как сейчас
                </button>
              )}
            </div>
          </div>

          <div className="farm-modal-sub appearance-note">
            Генерируйте сколько угодно — монеты списываются только при сохранении.
            Новый вид получат все ваши здания «{target.name}», в том числе построенные позже.
          </div>

          <button className="upgrade-btn" onClick={handleSave} disabled={!canSave}
            title={coins < price ? "Недостаточно монет" : !changed ? "Сгенерируйте новый вариант" : undefined}>
            💾 Сохранить за 💰 {price}
          </button>
          {saved && (
            <button className="farm-modal-btn ghost appearance-reset" onClick={handleReset} disabled={busy}>
              ↺ Вернуть исходный вид (бесплатно)
            </button>
          )}

          {status.text && <div className={`farm-modal-status ${status.error ? "error" : ""}`}>{status.text}</div>}
        </div>
      </div>
    </div>
  );
}
