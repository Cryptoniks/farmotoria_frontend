import { useEffect, useState } from "react";
import { api } from "../../shared/services/api";
import "./SeedSelectModal.css";
import "./FarmModals.css";
import SkillRow from "./SkillRow";

const percent = (exp, next) => (next > 0 ? Math.min(100, Math.round((exp / next) * 100)) : 100);

/** Угол карты: значок игрока (аватар, имя, уровень, опыт, ссылка на профиль) и рядом отдельный блок «❓ Как играть». */
export function ProfileBadge({ user, onOpen, onHelp }) {
  if (!user) return null;
  return (
    <div className="profile-corner">
      <div className="profile-badge">
        <button className="profile-badge-avatar" onClick={onOpen} title="Профиль">
          {(user.username || "?").slice(0, 1).toUpperCase()}
        </button>
        <div className="profile-badge-info">
          <div className="profile-badge-name">{user.username}</div>
          <div className="profile-badge-level">
            Ур. {user.level}
            {user.qualification_points > 0 && <span title="Очки квалификации — тратятся в Академии"> · 🎓 {user.qualification_points}</span>}
          </div>
          <div className="profile-badge-bar" title={`Опыт: ${user.exp} / ${user.exp_to_next}`}>
            <div style={{ width: `${user.exp_progress ?? percent(user.exp, user.exp_to_next)}%` }} />
          </div>
          <button className="profile-badge-link" onClick={onOpen}>👤 Профиль</button>
        </div>
      </div>
      {onHelp && (
        <button className="profile-help" onClick={onHelp} title="Как играть: разделы игры" aria-label="Как играть">❓</button>
      )}
    </div>
  );
}

/** Окно профиля: уровень, монеты, логин и email, дата регистрации, общие навыки и квалификации. */
export default function ProfileModal({ isOpen, onClose, onSaved }) {
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
      .catch(() => setStatus({ text: "Ошибка загрузки профиля", error: true }));
  }, [isOpen]);

  if (!isOpen) return null;

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.put("/api/me/", form);
      setProfile(res.data);
      setStatus({ text: "✅ Профиль сохранён", error: false });
      onSaved?.();
    } catch (err) {
      const data = err?.response?.data;
      const text = data?.detail || (data && Object.values(data).flat().join(" ")) || "Ошибка сохранения";
      setStatus({ text, error: true });
    }
    setBusy(false);
  };

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>👤 Профиль</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          {!profile ? (
            <div className="farm-modal-empty">{status.text || "Загрузка..."}</div>
          ) : (
            <>
              <div className="profile-head">
                <div className="profile-avatar">{(profile.username || "?").slice(0, 1).toUpperCase()}</div>
                <div className="profile-head-info">
                  <div className="profile-level">Уровень {profile.level}</div>
                  <div className="capacity-bar">
                    <div className="capacity-bar-fill" style={{ width: `${profile.exp_progress ?? 0}%` }} />
                  </div>
                  <div className="capacity-caption">
                    <span>Опыт {profile.exp} / {profile.exp_to_next}</span>
                    <span title="Очки квалификации: +1 за уровень, +2 за каждый 10-й; тратятся в Академии">
                      🎓 {profile.qualification_points ?? 0}
                    </span>
                    <span>💰 {profile.coins_balance.toLocaleString("ru-RU")}</span>
                  </div>
                </div>
              </div>

              <form className="profile-form" onSubmit={save}>
                <label>
                  Логин
                  <input className="farm-modal-input" value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
                </label>
                <label>
                  Email
                  <input className="farm-modal-input" type="email" value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </label>
                <div className="farm-modal-sub">
                  На ферме с {profile.date_joined ? new Date(profile.date_joined).toLocaleDateString("ru-RU") : "—"}
                </div>
                <button className="farm-modal-btn" type="submit" disabled={busy}>Сохранить</button>
                {status.text && <div className={`farm-modal-status ${status.error ? "error" : ""}`}>{status.text}</div>}
              </form>

              <div className="profile-skills-title">Общие навыки</div>
              <div className="farm-modal-list">
                {(profile.skills || []).map((s) => <SkillRow key={s.id} skill={s} />)}
                {(!profile.skills || profile.skills.length === 0) && <div className="farm-modal-empty">Навыки пока не прокачаны</div>}
              </div>

              <div className="profile-skills-title">Квалификации</div>
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
                  Нет изученных квалификаций. Чтобы получить первую, откройте Академию на карте.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
