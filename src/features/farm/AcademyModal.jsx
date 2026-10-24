import { useEffect, useState } from "react";
import { api } from "../../shared/services/api";
import "./SeedSelectModal.css";
import "./FarmModals.css";
import SkillRow from "./SkillRow";

const BRANCH_TITLES = { processing: "🪚 Переработка", production: "🏭 Производство" };

/** Карточка квалификации: ступени уровней, что они открывают, кнопка «Получить квалификацию». */
function QualificationCard({ q, busy, onLearn, child }) {
  return (
    <div className={`academy-card ${q.kind === "engineer" ? "engineer" : ""}`}>
      <div className="academy-card-head">
        <div>
          <div className="farm-modal-name">{q.kind === "engineer" ? "🛠 " : "🎓 "}{q.name}</div>
          <div className="farm-modal-sub">{q.description}</div>
        </div>
        <span className={`academy-level ${q.level ? "learned" : ""}`}>{q.level ? q.level_name : "Не изучена"}</span>
      </div>

      <div className="academy-steps">
        {q.levels.map((lv) => (
          <div key={lv.level} className={`academy-step ${q.level >= lv.level ? "done" : ""} ${q.next_level === lv.level ? "next" : ""}`}>
            <div className="academy-step-name">{q.level >= lv.level ? "✅" : "🔒"} {lv.name}</div>
            <div className="academy-step-unlocks">{lv.unlocks.join(", ") || "—"}</div>
            <div className="farm-modal-sub">💰 {lv.price.toLocaleString("ru-RU")} · 🎓 {lv.points}</div>
          </div>
        ))}
      </div>

      {q.next_level ? (
        <>
          <button className="farm-modal-btn academy-learn-btn" disabled={!q.can_learn || busy} onClick={() => onLearn(q.code)}>
            Получить квалификацию: {q.next_level_name} — 💰 {q.price.toLocaleString("ru-RU")} · 🎓 {q.points}
          </button>
          {q.lock_reason && <div className="academy-hint">🔒 {q.lock_reason}</div>}
        </>
      ) : (
        <div className="academy-hint done">Изучен максимальный уровень</div>
      )}
      {child}
    </div>
  );
}

/** Академия: общие навыки игрока и квалификации (изучаются за монеты и очки квалификации). */
export default function AcademyModal({ isOpen, onClose, onCoinsChange, onLearned }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("qualifications");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });

  useEffect(() => {
    if (!isOpen) return;
    setStatus({ text: "", error: false });
    api.get("/api/academy/")
      .then((res) => setData(res.data))
      .catch(() => setStatus({ text: "Ошибка загрузки Академии", error: true }));
  }, [isOpen]);

  if (!isOpen) return null;

  const learn = async (code) => {
    setBusy(true);
    try {
      const res = await api.post("/api/academy/learn/", { code });
      setData(res.data);
      onCoinsChange?.(res.data.coins_balance);
      onLearned?.();
      setStatus({ text: `✅ Получена квалификация «${res.data.learned.name}»: ${res.data.learned.level_name} уровень`, error: false });
    } catch (e) {
      setStatus({ text: e?.response?.data?.detail || "Не удалось изучить", error: true });
    }
    setBusy(false);
  };

  const quals = data?.qualifications || [];
  const mains = quals.filter((q) => q.kind === "main");
  const childOf = (main) => quals.find((q) => q.parent === main.code);

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>🏛 Академия</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          {!data ? (
            <div className="farm-modal-empty">{status.text || "Загрузка..."}</div>
          ) : (
            <>
              <div className="academy-summary">
                <span title="Очки квалификации: +1 за уровень игрока, +2 за каждый 10-й">
                  🎓 Очки квалификации: <b>{data.qualification_points}</b>
                </span>
                <span>💰 {data.coins_balance.toLocaleString("ru-RU")}</span>
                <span>Уровень {data.level}</span>
              </div>
              <div className="farm-modal-sub">
                Очки даются за уровни игрока: +1 за каждый новый уровень, +2 за каждый 10-й.
              </div>

              <div className="farm-modal-tabs academy-tabs">
                <button className={`farm-modal-tab ${tab === "qualifications" ? "active" : ""}`} onClick={() => setTab("qualifications")}>
                  Квалификации
                </button>
                <button className={`farm-modal-tab ${tab === "skills" ? "active" : ""}`} onClick={() => setTab("skills")}>
                  Общие навыки
                </button>
              </div>

              {status.text && <div className={`farm-modal-status ${status.error ? "error" : ""}`}>{status.text}</div>}

              {tab === "qualifications" && mains.map((main) => {
                const engineer = childOf(main);
                return (
                  <div key={main.code} className="academy-branch">
                    <div className="profile-skills-title">{BRANCH_TITLES[main.branch] || main.branch}</div>
                    <QualificationCard
                      q={main}
                      busy={busy}
                      onLearn={learn}
                      child={engineer && !engineer.visible && (
                        <div className="academy-hint">
                          🔓 После Базового уровня откроется ветка «{engineer.name}» — новые циклы в зданиях
                        </div>
                      )}
                    />
                    {engineer?.visible && <QualificationCard q={engineer} busy={busy} onLearn={learn} />}
                  </div>
                );
              })}

              {tab === "skills" && (
                <div className="farm-modal-list">
                  {data.skills.map((s) => <SkillRow key={s.code} skill={s} />)}
                  <div className="farm-modal-sub">Общие навыки растут сами, от работы в зданиях своей группы.</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
