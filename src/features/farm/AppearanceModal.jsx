import { useMemo, useState } from "react";
import { useT } from "../../i18n/context";
import {
  COLOR_SLOTS,
  defaultColors,
  isDefaultAppearance,
  randomColors,
  randomSeed,
  renderBuildingSvg,
  sameAppearance,
  slotLabels,
  svgToDataUrl,
} from "./buildingArt";
import { rng } from "./buildingArt/core";
import "./SeedSelectModal.css";
import "./FarmModals.css";

const DEFAULT = { v: 2, shape: 0, details: 0, colors: null };

// Палитра 256 цветов: 16 столбцов (серые + 15 оттенков по кругу) × 16 уровней яркости
function hslToHex(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return "#" + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
const PALETTE_256 = Array.from({ length: 16 }, (_, row) =>
  Array.from({ length: 16 }, (_, col) => {
    const l = 94 - row * 5.4;
    return col === 0 ? hslToHex(0, 0, l) : hslToHex((col - 1) * 24, 68, l);
  })
);

/** Текущие цвета вида: заданные игроком, иначе случайные для новой формы или стандартные для исходной. */
function effectiveColors(slug, look) {
  if (look.colors) return look.colors;
  return look.shape ? randomColors(rng(look.shape), slug) : defaultColors(slug);
}

/**
 * Смена внешнего вида типа здания. Форму, детали и цвета можно генерировать сколько угодно;
 * каждый цвет можно выбрать вручную из палитры 256 цветов или любой RGB. Монеты списываются
 * один раз — при сохранении. Вид действует на все здания этого типа у игрока.
 */
export default function AppearanceModal({ target, saved, coins, price, onSave, onReset, onClose }) {
  const slug = target?.slug;
  const [look, setLook] = useState(saved || DEFAULT);
  const [locked, setLocked] = useState({});
  const [picker, setPicker] = useState(null); // слот, для которого открыта палитра
  const [showColors, setShowColors] = useState(false); // блок цветов открывается кнопкой «🎨 Цвета»
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });

  const colors = effectiveColors(slug, look);
  const t = useT();
  const slotKeys = slotLabels(slug);
  const labels = Object.fromEntries(Object.entries(slotKeys).map(([slot, key]) => [slot, t(key)]));
  const draftUrl = useMemo(() => svgToDataUrl(renderBuildingSvg(slug, isDefaultAppearance(look) ? null : look)), [slug, look]);
  const savedUrl = useMemo(() => svgToDataUrl(renderBuildingSvg(slug, saved)), [slug, saved]);

  const changed = !sameAppearance(look, saved);
  const canSave = changed && !isDefaultAppearance(look) && coins >= price && !busy;

  const update = (patch) => {
    setLook((prev) => {
      const next = { ...prev, colors: effectiveColors(slug, prev), ...patch };
      // Исходная форма в стандартных цветах — это стандартный вид, а не «новый» за монеты
      const std = defaultColors(slug);
      if (!next.shape && COLOR_SLOTS.every((s) => next.colors[s].toLowerCase() === std[s].toLowerCase())) next.colors = null;
      return next;
    });
    setStatus({ text: "", error: false });
  };
  const rollColors = () => randomColors(Math.random, slug, colors, locked);

  const setColor = (slot, hex) => {
    update({ colors: { ...colors, [slot]: hex } });
    setLocked((prev) => ({ ...prev, [slot]: true }));
  };

  const run = async (action, okText) => {
    setBusy(true);
    const res = await action();
    setBusy(false);
    setStatus(res?.error ? { text: res.error, error: true } : { text: okText, error: false });
  };

  const handleSave = () => run(() => onSave(slug, { v: 2, ...look, colors }), t("looks.saved", { name: target.name }));
  const handleReset = () => {
    if (!confirm(t("looks.resetConfirm", { name: target.name }))) return;
    run(async () => {
      const res = await onReset(slug);
      if (!res?.error) setLook(DEFAULT);
      return res;
    }, t("looks.resetDone"));
  };

  return (
    <div className="seed-modal-overlay appearance-overlay" onClick={onClose}>
      <div className="seed-modal-content appearance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>{t("looks.title", { name: target.name })}</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          <div className="appearance-stage">
            <img src={draftUrl} alt={target.name} />
            <span className="appearance-badge">{look.shape ? t("looks.newShape") : t("looks.originalShape")}{changed ? t("looks.unsaved") : ""}</span>
          </div>

          <div className="appearance-reroll">
            <button className="farm-modal-btn" disabled={busy}
              onClick={() => update({ shape: randomSeed(), details: randomSeed(), colors: rollColors() })}>
              {t("looks.allNew")}
            </button>
            <button className="farm-modal-btn ghost" disabled={busy} onClick={() => update({ shape: randomSeed(), details: look.details || randomSeed() })}>
              {t("looks.shape")}
            </button>
            <button className="farm-modal-btn ghost" disabled={busy || !look.shape} title={look.shape ? undefined : t("looks.detailsHint")}
              onClick={() => update({ details: randomSeed() })}>
              {t("looks.details")}
            </button>
            <button className={`farm-modal-btn ghost ${showColors ? "active" : ""}`} disabled={busy}
              onClick={() => { setShowColors((v) => !v); setPicker(null); }}>
              {t("looks.colors")} {showColors ? "▴" : "▾"}
            </button>
            <button className="farm-modal-btn ghost" disabled={busy || !look.shape} onClick={() => update({ shape: 0, details: 0 })}>
              {t("looks.backToOriginal")}
            </button>
          </div>

          {/* Цвета: появляются по кнопке «🎨 Цвета». Клик по карточке открывает палитру, замок — отдельно */}
          {showColors && (
            <div className="appearance-colors-panel">
              <div className="appearance-colors">
                {COLOR_SLOTS.map((slot) => {
                  const toggle = () => setPicker(picker === slot ? null : slot);
                  return (
                    <div key={slot} role="button" tabIndex={0} title={t("looks.pickColor")}
                      className={`appearance-color ${picker === slot ? "active" : ""}`}
                      onClick={toggle}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())}>
                      <span className="appearance-swatch" style={{ background: colors[slot] }} />
                      <div className="appearance-color-label">
                        <div>{labels[slot]}</div>
                        <code>{colors[slot]}</code>
                      </div>
                      <button className="appearance-lock"
                        onClick={(e) => { e.stopPropagation(); setLocked((p) => ({ ...p, [slot]: !p[slot] })); }}
                        title={locked[slot] ? t("looks.colorLocked") : t("looks.lockColor")}>
                        {locked[slot] ? "🔒" : "🔓"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="appearance-colors-actions">
                <button className="farm-modal-btn ghost" disabled={busy} onClick={() => update({ colors: rollColors() })}>
                  {t("looks.randomColors")}
                </button>
                <button className="farm-modal-btn ghost" disabled={busy}
                  onClick={() => { update({ colors: defaultColors(slug) }); setLocked({}); }}>
                  {t("looks.originalColors")}
                </button>
              </div>
            </div>
          )}

          {showColors && picker && (
            <div className="appearance-palette">
              <div className="appearance-palette-head">
                <span>{t("looks.chooseColor", { slot: labels[picker] })}</span>
                <label className="farm-modal-btn ghost appearance-custom">
                  {t("looks.customColor")}
                  <input type="color" value={colors[picker]} onChange={(e) => setColor(picker, e.target.value)} />
                </label>
              </div>
              <div className="appearance-grid">
                {PALETTE_256.flat().map((hex, i) => (
                  <button key={i} className={`appearance-cell ${hex === colors[picker] ? "selected" : ""}`}
                    style={{ background: hex }} title={hex} onClick={() => setColor(picker, hex)} />
                ))}
              </div>
            </div>
          )}

          <div className="appearance-current">
            <img src={savedUrl} alt={t("looks.now")} />
            <div>
              <div className="farm-modal-name">{t("looks.now")}</div>
              <div className="farm-modal-sub">{saved ? t("looks.custom") : t("looks.original")}</div>
              {changed && (
                <button className="farm-modal-btn ghost" disabled={busy} onClick={() => setLook(saved || DEFAULT)}>
                  {t("looks.revert")}
                </button>
              )}
            </div>
          </div>

          <div className="farm-modal-sub appearance-note">
            {t("looks.hint1")} {t("looks.hint2", { name: target.name })}
          </div>

          <button className="upgrade-btn" onClick={handleSave} disabled={!canSave}
            title={coins < price ? t("common.noCoins") : !changed ? t("looks.changeSomething") : undefined}>
            {t("looks.saveFor", { price: t.num(price) })}
          </button>
          {saved && (
            <button className="farm-modal-btn ghost appearance-reset" onClick={handleReset} disabled={busy}>
              {t("looks.resetFree")}
            </button>
          )}

          {status.text && <div className={`farm-modal-status ${status.error ? "error" : ""}`}>{status.text}</div>}
        </div>
      </div>
    </div>
  );
}
