import { useEffect, useState } from "react";
import { api } from "../../shared/services/api";
import "./SeedSelectModal.css";
import "./FarmModals.css";
import SkillRow from "./SkillRow";
import { useT } from "../../i18n/context";

const percent = (exp, next) => (next > 0 ? Math.min(100, Math.round((exp / next) * 100)) : 100);

/** Угол карты: значок игрока (аватар, имя, уровень, опыт, ссылка на профиль) и рядом блоки «❓ Как играть» и «💎 Премиум-магазин». */
export function ProfileBadge({ user, onOpen, onHelp, onPremium }) {
  const t = useT();
  if (!user) return null;
  return (
    <div className="profile-corner">
      <div className="profile-badge">
        <button className="profile-badge-avatar" onClick={onOpen} title={t("profile.open")}>
          {(user.username || "?").slice(0, 1).toUpperCase()}
        </button>
        <div className="profile-badge-info">
          <div className="profile-badge-name">
            {user.username}
            {user.is_premium && <span className="profile-premium" title={t("profile.premiumActive")}> 👑</span>}
          </div>
          <div className="profile-badge-level">
            {t("profile.levelShort", { level: user.level })}
            {user.qualification_points > 0 && <span title={t("profile.pointsTitle")}> · 🎓 {user.qualification_points}</span>}
          </div>
          <div className="profile-badge-bar" title={t("profile.expTitle", { exp: user.exp, next: user.exp_to_next })}>
            <div style={{ width: `${user.exp_progress ?? percent(user.exp, user.exp_to_next)}%` }} />
          </div>
          <button className="profile-badge-link" onClick={onOpen}>{t("profile.link")}</button>
        </div>
      </div>
      {onHelp && (
        <button className="profile-help" onClick={onHelp} title={t("profile.helpTitle")} aria-label={t("profile.help")}>❓</button>
      )}
      {onPremium && (
        <button className="profile-help premium" onClick={onPremium} title={t("profile.premiumShop")} aria-label={t("profile.premiumShop")}>💎</button>
      )}
    </div>
  );
}

/** Окно профиля: уровень, монеты, логин и email, дата регистрации, общие навыки и квалификации. */
export default function ProfileModal({ isOpen, onClose, onSaved }) {
  const t = useT();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ username: "", email: "" });
  const [status, setStatus] = useState({ text: "", error: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStatus({ text: "", error: false });
    api.get("/api/me/")
      .then((res) => {
        setProfile(res.data);
        setForm({ username: res.data.username, email: res.data.email || "" });
      })
      .catch(() => setStatus({ text: t("profile.loadError"), error: true }));
  }, [isOpen, t]);

  if (!isOpen) return null;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.put("/api/me/", form);
      setProfile(res.data);
      setStatus({ text: t("profile.saved"), error: false });
      onSaved?.();
    } catch (err) {
      const data = err?.response?.data;
      const text = data?.detail || (data && Object.values(data).flat().join(" ")) || t("profile.saveError");
      setStatus({ text, error: true });
    }
    setBusy(false);
  };

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>{t("profile.title")}</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          {!profile ? (
            <div className="farm-modal-empty">{status.text || t("common.loading")}</div>
          ) : (
            <>
              <div className="profile-head">
                <div className="profile-avatar">{(profile.username || "?").slice(0, 1).toUpperCase()}</div>
                <div className="profile-head-info">
                  <div className="profile-level">{t("profile.level", { level: profile.level })}</div>
                  <div className="capacity-bar">
                    <div className="capacity-bar-fill" style={{ width: `${profile.exp_progress ?? 0}%` }} />
                  </div>
                  <div className="capacity-caption">
                    <span>{t("profile.exp", { exp: profile.exp, next: profile.exp_to_next })}</span>
                    <span title={t("profile.pointsLong")}>
                      🎓 {profile.qualification_points ?? 0}
                    </span>
                    <span>💰 {t.num(profile.coins_balance)}</span>
                  </div>
                </div>
              </div>

              <form className="profile-form" onSubmit={save}>
                <label>
                  {t("auth.username")}
<input className="farm-modal-input" value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
                </label>
                <label>
                  {t("auth.email")}
                  <input className="farm-modal-input" type="email" value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </label>
                <div className="farm-modal-sub">
                  {t("profile.since", { date: profile.date_joined ? t.date(profile.date_joined, { dateStyle: "medium" }) : "—" })}
                </div>
                <button className="farm-modal-btn" type="submit" disabled={busy}>{t("profile.save")}</button>
                {status.text && <div className={`farm-modal-status ${status.error ? "error" : ""}`}>{status.text}</div>}
              </form>

              <div className="profile-skills-title">{t("profile.skills")}</div>
              <div className="farm-modal-list">
                {(profile.skills || []).map((s) => <SkillRow key={s.id} skill={s} />)}
                {(!profile.skills || profile.skills.length === 0) && <div className="farm-modal-empty">{t("profile.noSkills")}</div>}
              </div>

              <div className="profile-skills-title">{t("profile.qualifications")}</div>
              {profile.qualifications?.length ? (
                <div className="farm-modal-list">
                  {profile.qualifications.map((g) => (
                    <div key={g.branch} className="profile-qualification">
                      <span className="profile-qualification-main">🎓 {g.main.title}</span>
                      {g.engineer && <span className="profile-qualification-engineer">🛠 {g.engineer.title}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="farm-modal-empty">
                  {t("profile.noQualifications")}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
