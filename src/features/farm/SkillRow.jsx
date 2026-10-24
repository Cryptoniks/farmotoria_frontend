import "./FarmModals.css";
import { useT } from "../../i18n/context";

const percent = (exp, next) => (next > 0 ? Math.min(100, Math.round((exp / next) * 100)) : 100);

/** Общий навык: уровень и опыт, откуда растёт, что даёт сейчас и что добавит следующий уровень. */
export default function SkillRow({ skill }) {
  const t = useT();
  const isMax = skill.level >= skill.max_level;
  return (
    <div className="profile-skill">
      <div>
        <div className="farm-modal-name">{skill.name} <span className="farm-modal-sub">{t("skill.level", { level: skill.level, max: skill.max_level })}</span></div>
        {skill.description && <div className="farm-modal-sub">{skill.description}</div>}
        {skill.bonus?.length > 0 && (
          <div className="skill-bonus-now">{t("skill.now", { bonus: skill.bonus.join(" • ") })}</div>
        )}
        {isMax ? (
          <div className="skill-bonus-next">{t("skill.maxLevel")}</div>
        ) : skill.next_bonus?.length > 0 && (
          <div className="skill-bonus-next">{t("skill.next", { level: skill.level + 1, bonus: skill.next_bonus.join(" • ") })}</div>
        )}
      </div>
      <div className="profile-skill-bar">
        <div className="capacity-bar">
          <div className="capacity-bar-fill" style={{ width: `${percent(skill.exp, skill.exp_to_next)}%` }} />
        </div>
        <div className="farm-modal-sub">{isMax ? t("skill.max") : `${skill.exp} / ${skill.exp_to_next}`}</div>
      </div>
    </div>
  );
}
