import { useEffect, useState } from "react";
import { api } from "../../shared/services/api";
import "./SeedSelectModal.css";
import "./FarmModals.css";
import { useT } from "../../i18n/context";

// Что даёт Премиум: иконка и ключ текстов premium.feature.<key>.title / .text в словарях (src/i18n).
// Новая премиум-функция — ещё одна запись здесь и строки в словарях.
const PREMIUM_FEATURES = [
  { icon: "🌾", key: "multi" },
  { icon: "🧺", key: "harvest" },
  { icon: "🗺️", key: "land" },
  { icon: "👑", key: "crown" },
];

/** Премиум-магазин: алмазы за реальные деньги (пока заглушка) и Премиум-подписка за алмазы. */
export default function PremiumModal({ isOpen, onClose, onChanged }) {
  const t = useT();
  const planTitle = (days) => (["1", "7", "30"].includes(String(days)) ? t(`premium.plan.${days}`) : t("premium.planDays", { days }));
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("premium");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });

  useEffect(() => {
    if (!isOpen) return;
    setStatus({ text: "", error: false });
    api.get("/api/premium/")
      .then((res) => setData(res.data))
      .catch(() => setStatus({ text: t("premium.loadError"), error: true }));
  }, [isOpen, t]);

  if (!isOpen) return null;

  const subscribe = async (days) => {
    setBusy(true);
    try {
      const res = await api.post("/api/premium/subscribe/", { days });
      setData(res.data);
      onChanged?.();
      setStatus({ text: t(data.is_premium ? "premium.extended" : "premium.started", { plan: planTitle(days) }), error: false });
    } catch (e) {
      setStatus({ text: e?.response?.data?.detail || t("premium.error"), error: true });
    }
    setBusy(false);
  };

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>{t("premium.title")}</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          {!data ? (
            <div className="farm-modal-empty">{status.text || t("common.loading")}</div>
          ) : (
            <>
              <div className="academy-summary">
                <span>💎 <b>{t.num(data.diamonds_balance)}</b> {t("bank.diamonds")}</span>
                <span>
                  {data.is_premium
                    ? t("premium.until", { date: t.date(data.premium_until, { dateStyle: "medium", timeStyle: "short" }) })
                    : t("premium.inactive")}
                </span>
              </div>

              <div className="farm-modal-tabs academy-tabs">
                <button className={`farm-modal-tab ${tab === "premium" ? "active" : ""}`} onClick={() => setTab("premium")}>{t("premium.tab.premium")}</button>
                <button className={`farm-modal-tab ${tab === "diamonds" ? "active" : ""}`} onClick={() => setTab("diamonds")}>{t("premium.tab.diamonds")}</button>
              </div>

              {status.text && <div className={`farm-modal-status ${status.error ? "error" : ""}`}>{status.text}</div>}

              {tab === "premium" && (
                <>
                  <div className="farm-modal-sub">
                    {t("premium.extendNote")}
                  </div>
                  <div className="premium-grid">
                    {data.plans.map((p) => (
                      <div key={p.days} className="premium-card">
                        <div className="premium-card-title">👑 {planTitle(p.days)}</div>
                        <div className="premium-card-price">💎 {p.price}</div>
                        <button className="farm-modal-btn" disabled={busy || data.diamonds_balance < p.price} onClick={() => subscribe(p.days)}
                          title={data.diamonds_balance < p.price ? t("premium.noDiamonds") : undefined}>
                          {data.is_premium ? t("premium.extend") : t("common.buy")}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="farm-modal-sub" style={{ marginTop: 10 }}>
                    {t("premium.whereDiamonds")}
                  </div>

                  <div className="profile-skills-title premium-features-title">{t("premium.features")}</div>
                  <div className="premium-features">
                    {PREMIUM_FEATURES.map((f) => (
                      <div key={f.key} className="guide-card">
                        <div className="guide-icon">{f.icon}</div>
                        <div>
                          <div className="guide-title">{t(`premium.feature.${f.key}.title`)}</div>
                          <div className="guide-text">{t(`premium.feature.${f.key}.text`)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {tab === "diamonds" && (
                <>
                  <div className="farm-modal-sub">{t("premium.diamondsSoon")}</div>
                  <div className="premium-grid">
                    {data.diamond_packs.map((p) => (
                      <div key={p.diamonds} className="premium-card">
                        <div className="premium-card-title">💎 {t.num(p.diamonds)}</div>
                        {p.bonus && <div className="premium-card-bonus">{p.bonus}</div>}
                        <div className="premium-card-price">{p.price}</div>
                        <button className="farm-modal-btn" disabled={!data.payments_enabled}>{t("premium.soon")}</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
