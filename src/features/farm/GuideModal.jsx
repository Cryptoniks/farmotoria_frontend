import "./SeedSelectModal.css";
import "./FarmModals.css";
import { useT } from "../../i18n/context";

// Разделы игры: иконка и ключ текстов guide.<key>.title / .text в словарях (src/i18n).
// Новый раздел (например, Квесты) — ещё одна запись здесь и строки в словарях.
const GUIDE_SECTIONS = [
  { icon: "🗺️", key: "map" },
  { icon: "🏗️", key: "build" },
  { icon: "🌾", key: "fields" },
  { icon: "⛏️", key: "extraction" },
  { icon: "🏭", key: "processing" },
  { icon: "🐄", key: "animals" },
  { icon: "📦", key: "storage" },
  { icon: "🛒", key: "trade" },
  { icon: "🏦", key: "bank" },
  { icon: "💎", key: "premium" },
  { icon: "🏛", key: "academy" },
  { icon: "⬆️", key: "levels" },
  { icon: "👤", key: "profile" },
  { icon: "🎨", key: "looks" },
];

/** Окно «Как играть»: краткое описание всех разделов игры. Показывается при входе, повторно — кнопкой «❓». */
export default function GuideModal({ isOpen, onClose, hideOnStart, onHideOnStartChange }) {
  const t = useT();
  if (!isOpen) return null;
  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>{t("guide.title")}</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          <div className="farm-modal-sub">{t("guide.intro")}</div>
          <div className="guide-grid">
            {GUIDE_SECTIONS.map((s) => (
              <div key={s.key} className="guide-card">
                <div className="guide-icon">{s.icon}</div>
                <div>
                  <div className="guide-title">{t(`guide.${s.key}.title`)}</div>
                  <div className="guide-text">{t(`guide.${s.key}.text`)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="guide-footer">
            <label className="guide-check">
              <input type="checkbox" checked={hideOnStart} onChange={(e) => onHideOnStartChange?.(e.target.checked)} />
              {t("guide.hideOnStart")}
            </label>
            <button className="farm-modal-btn" onClick={onClose}>{t("guide.play")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
