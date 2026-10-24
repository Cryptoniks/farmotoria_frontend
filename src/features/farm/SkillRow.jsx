import "./FarmModals.css";

const percent = (exp, next) => (next > 0 ? Math.min(100, Math.round((exp / next) * 100)) : 100);

/** Общий навык: уровень и опыт, откуда растёт, что даёт сейчас и что добавит следующий уровень. */
export default function SkillRow({ skill }) {
  const isMax = skill.level >= skill.max_level;
  return (
    <div className="profile-skill">
      <div>
        <div className="farm-modal-name">{skill.name} <span className="farm-modal-sub">ур. {skill.level} / {skill.max_level}</span></div>
        {skill.description && <div className="farm-modal-sub">{skill.description}</div>}
        {skill.bonus?.length > 0 && (
          <div className="skill-bonus-now">Сейчас: {skill.bonus.join(" • ")}</div>
        )}
        {isMax ? (
          <div className="skill-bonus-next">Максимальный уровень</div>
        ) : skill.next_bonus?.length > 0 && (
          <div className="skill-bonus-next">Ур. {skill.level + 1}: {skill.next_bonus.join(" • ")}</div>
        )}
      </div>
      <div className="profile-skill-bar">
        <div className="capacity-bar">
          <div className="capacity-bar-fill" style={{ width: `${percent(skill.exp, skill.exp_to_next)}%` }} />
        </div>
        <div className="farm-modal-sub">{isMax ? "максимум" : `${skill.exp} / ${skill.exp_to_next}`}</div>
      </div>
    </div>
  );
}
