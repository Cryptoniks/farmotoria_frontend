import { useMemo, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });

  const colors = effectiveColors(slug, look);
  const labels = slotLabels(slug);
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

  const handleSave = () => run(() => onSave(slug, { v: 2, ...look, colors }), `✅ Новый вид сохранён для всех зданий «${target.name}»`);
  const handleReset = () => {
    if (!confirm(`Вернуть всем зданиям «${target.name}» исходный вид? Это бесплатно.`)) return;
    run(async () => {
      const res = await onReset(slug);
      if (!res?.error) setLook(DEFAULT);
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
            <span className="appearance-badge">{look.shape ? "Новая форма" : "Исходная форма"}{changed ? " • не сохранено" : ""}</span>
          </div>

          <div className="appearance-reroll">
            <button className="farm-modal-btn" disabled={busy}
              onClick={() => update({ shape: randomSeed(), details: randomSeed(), colors: rollColors() })}>
              🎲 Всё новое
            </button>
            <button className="farm-modal-btn ghost" disabled={busy} onClick={() => update({ shape: randomSeed(), details: look.details || randomSeed() })}>
              🏠 Форма
            </button>
            <button className="farm-modal-btn ghost" disabled={busy || !look.shape} title={look.shape ? undefined : "Детали меняются у новой формы"}
              onClick={() => update({ details: randomSeed() })}>
              🪵 Детали
            </button>
            <button className="farm-modal-btn ghost" disabled={busy} onClick={() => update({ colors: rollColors() })}>
              🎨 Цвета
            </button>
            <button className="farm-modal-btn ghost" disabled={busy || !look.shape} onClick={() => update({ shape: 0, details: 0 })}>
              ↩ Исходная форма
            </button>
          </div>

          {/* Цвета: образец + замок; клик по образцу открывает палитру */}
          <div className="appearance-colors">
            {COLOR_SLOTS.map((slot) => (
              <div key={slot} className={`appearance-color ${picker === slot ? "active" : ""}`}>
                <button className="appearance-swatch" style={{ background: colors[slot] }}
                  onClick={() => setPicker(picker === slot ? null : slot)} title="Выбрать цвет" />
                <div className="appearance-color-label">
                  <div>{labels[slot]}</div>
                  <code>{colors[slot]}</code>
                </div>
                <button className="appearance-lock" onClick={() => setLocked((p) => ({ ...p, [slot]: !p[slot] }))}
                  title={locked[slot] ? "Цвет закреплён: 🎲 его не меняет" : "Закрепить цвет"}>
                  {locked[slot] ? "🔒" : "🔓"}
                </button>
              </div>
            ))}
          </div>
          <button className="farm-modal-btn ghost appearance-default-colors" disabled={busy}
            onClick={() => { update({ colors: defaultColors(slug) }); setLocked({}); }}>
            Исходные цвета
          </button>

          {picker && (
            <div className="appearance-palette">
              <div className="appearance-palette-head">
                <span>{labels[picker]}: выберите цвет</span>
                <label className="farm-modal-btn ghost appearance-custom">
                  🎯 Свой цвет
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
            <img src={savedUrl} alt="Сейчас" />
            <div>
              <div className="farm-modal-name">Сейчас</div>
              <div className="farm-modal-sub">{saved ? "Свой вид" : "Исходный вид"}</div>
              {changed && (
                <button className="farm-modal-btn ghost" disabled={busy} onClick={() => setLook(saved || DEFAULT)}>
                  ↩ Вернуть как сейчас
                </button>
              )}
            </div>
          </div>

          <div className="farm-modal-sub appearance-note">
            Генерируйте и подбирайте цвета сколько угодно — монеты списываются только при сохранении.
            Новый вид получат все ваши здания «{target.name}», в том числе построенные позже.
          </div>

          <button className="upgrade-btn" onClick={handleSave} disabled={!canSave}
            title={coins < price ? "Недостаточно монет" : !changed ? "Измените форму или цвета" : undefined}>
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
