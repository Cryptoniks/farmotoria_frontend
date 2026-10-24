import { useEffect, useState } from "react";
import { api } from "../../shared/services/api";
import "./SeedSelectModal.css";
import "./FarmModals.css";

const PLAN_TITLES = { 1: "1 день", 7: "7 дней", 30: "30 дней" };

// Что даёт Премиум. Новая премиум-функция — ещё одна запись в этом списке.
const PREMIUM_FEATURES = [
  {
    icon: "🌾",
    title: "Множественный посев",
    text: "Выберите семя один раз — и сажайте его на любые пустые поля кликом по карте, без окна. "
      + "Поле под курсором подсвечивается: зелёным пустое, красным засеянное.",
  },
  {
    icon: "🧺",
    title: "Сбор со всех полей",
    text: "Одной кнопкой собрать урожай со всех созревших полей — и сразу посадить в каждое то же семя.",
  },
  {
    icon: "🗺️",
    title: "Вдвое больше земли",
    text: "За монеты — 2 новых участка на каждый уровень игрока вместо одного.",
  },
  {
    icon: "👑",
    title: "Корона у имени",
    text: "Значок Премиума в профиле, пока подписка действует.",
  },
];

/** Премиум-магазин: алмазы за реальные деньги (пока заглушка) и Премиум-подписка за алмазы. */
export default function PremiumModal({ isOpen, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("premium");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });

  useEffect(() => {
    if (!isOpen) return;
    setStatus({ text: "", error: false });
    api.get("/api/premium/")
      .then((res) => setData(res.data))
      .catch(() => setStatus({ text: "Ошибка загрузки магазина", error: true }));
  }, [isOpen]);

  if (!isOpen) return null;

  const subscribe = async (days) => {
    setBusy(true);
    try {
      const res = await api.post("/api/premium/subscribe/", { days });
      setData(res.data);
      onChanged?.();
      const verb = data.is_premium ? "продлён" : "оформлен";
      setStatus({ text: `✅ Премиум ${verb} на ${PLAN_TITLES[days]}`, error: false });
    } catch (e) {
      setStatus({ text: e?.response?.data?.detail || "Не удалось оформить подписку", error: true });
    }
    setBusy(false);
  };

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>💎 Премиум-магазин</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          {!data ? (
            <div className="farm-modal-empty">{status.text || "Загрузка..."}</div>
          ) : (
            <>
              <div className="academy-summary">
                <span>💎 <b>{data.diamonds_balance.toLocaleString("ru-RU")}</b> алмазов</span>
                <span>
                  {data.is_premium
                    ? `👑 Премиум до ${new Date(data.premium_until).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}`
                    : "Премиум не активен"}
                </span>
              </div>

              <div className="farm-modal-tabs academy-tabs">
                <button className={`farm-modal-tab ${tab === "premium" ? "active" : ""}`} onClick={() => setTab("premium")}>👑 Премиум</button>
                <button className={`farm-modal-tab ${tab === "diamonds" ? "active" : ""}`} onClick={() => setTab("diamonds")}>💎 Алмазы</button>
              </div>

              {status.text && <div className={`farm-modal-status ${status.error ? "error" : ""}`}>{status.text}</div>}

              {tab === "premium" && (
                <>
                  <div className="farm-modal-sub">
                    Если подписка уже действует, новые дни добавятся к её сроку.
                  </div>
                  <div className="premium-grid">
                    {data.plans.map((p) => (
                      <div key={p.days} className="premium-card">
                        <div className="premium-card-title">👑 {PLAN_TITLES[p.days] || `${p.days} дн.`}</div>
                        <div className="premium-card-price">💎 {p.price}</div>
                        <button className="farm-modal-btn" disabled={busy || data.diamonds_balance < p.price} onClick={() => subscribe(p.days)}
                          title={data.diamonds_balance < p.price ? "Недостаточно алмазов" : undefined}>
                          {data.is_premium ? "Продлить" : "Купить"}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="farm-modal-sub" style={{ marginTop: 10 }}>
                    Алмазы можно купить в Банке за монеты или во вкладке «Алмазы».
                  </div>

                  <div className="profile-skills-title premium-features-title">Что даёт Премиум</div>
                  <div className="premium-features">
                    {PREMIUM_FEATURES.map((f) => (
                      <div key={f.title} className="guide-card">
                        <div className="guide-icon">{f.icon}</div>
                        <div>
                          <div className="guide-title">{f.title}</div>
                          <div className="guide-text">{f.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {tab === "diamonds" && (
                <>
                  <div className="farm-modal-sub">Покупка алмазов за реальные деньги скоро появится.</div>
                  <div className="premium-grid">
                    {data.diamond_packs.map((p) => (
                      <div key={p.diamonds} className="premium-card">
                        <div className="premium-card-title">💎 {p.diamonds.toLocaleString("ru-RU")}</div>
                        {p.bonus && <div className="premium-card-bonus">{p.bonus}</div>}
                        <div className="premium-card-price">{p.price}</div>
                        <button className="farm-modal-btn" disabled={!data.payments_enabled}>Скоро</button>
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
