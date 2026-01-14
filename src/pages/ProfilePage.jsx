import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";
import "../styles/ProfilePage.css";

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [status, setStatus] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const access = localStorage.getItem("access");
    if (!access) {
      setStatus("Необходимо войти.");
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/me/", {
          headers: { Authorization: `Bearer ${access}` },
        });
        setProfile(res.data);
        setUsername(res.data.username);
        setEmail(res.data.email || "");
        setSkills(res.data.skills || []);
      } catch (err) {
        console.error(err);
        setStatus("Ошибка загрузки профиля.");
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    const access = localStorage.getItem("access");
    if (!access) return;

    try {
      const res = await api.put(
        "/api/me/",
        { username, email },
        { headers: { Authorization: `Bearer ${access}` } }
      );
      setProfile(res.data);
      setStatus("Профиль сохранён.");
      setSkills(res.data.skills || []);
    } catch (err) {
      console.error(err);
      setStatus("Ошибка сохранения профиля.");
    }
  };

  if (!profile) {
    return (
      <div className="profile-page">
        <h2 className="profile-title">Личный кабинет</h2>
        <p>{status || "Загрузка..."}</p>
      </div>
    );
  }

  const joined = profile.date_joined
    ? new Date(profile.date_joined).toLocaleString()
    : "";

  // Расчёт прогресса уровня профиля
  const expPrev = profile.level > 1 ? (50 * profile.level * (profile.level - 1)) / 2 : 0;
  const expNextTotal = profile.exp_next ?? 0;
  const expInLevel = Math.max(0, profile.exp - expPrev);
  const expNeed = Math.max(1, expNextTotal - expPrev); // защита от деления на 0
  const levelProgress = Math.min(100, Math.round((expInLevel / expNeed) * 100));
  const expLeft = Math.max(0, expNeed - expInLevel);


  return (
    <div className="profile-page">
      {/* Верхняя карточка профиля */}
      <section className="profile-card">
        <div className="profile-card-left">
          <div className="profile-avatar-circle">LVL {profile.level}</div>

          <div className="profile-level-bar">
            <div
              className="profile-level-bar-fill"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="profile-level-text">
            {expInLevel.toLocaleString()} / {expNeed.toLocaleString()} EXP
          </div>
          <div className="profile-coins">
            💰 {profile.coins_balance.toLocaleString()} монет
          </div>

          <button className="profile-settings-btn" onClick={handleSave}>
            Сохранить изменения
          </button>
        </div>

        <div className="profile-card-right">
          <div className="profile-info-row">
            <span className="profile-info-label">Логин:</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="profile-input"
            />
          </div>

          <div className="profile-info-row">
            <span className="profile-info-label">Email:</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="profile-input"
            />
          </div>

          <div className="profile-info-row">
            <span className="profile-info-label">Зарегистрирован:</span>
            <span className="profile-info-value">{joined}</span>
          </div>

          {status && <p className="profile-status">{status}</p>}
        </div>
      </section>

      {/* Нижняя карточка навыков */}
      <section className="profile-skills-card">
        <h3>Навыки</h3>

        {skills.length === 0 && <p>Навыки пока не прокачаны.</p>}

        {skills.map((skill) => {
          const percent =
            skill.exp_to_next > 0
              ? Math.min(100, Math.round((skill.exp / skill.exp_to_next) * 100))
              : 100;

          return (
            <div key={skill.id} className="skill-row">
              <div className="skill-name">{skill.name}</div>

              <div className="skill-description">
                {skill.effect_name}
              </div>

              <div className="skill-progress-wrapper">
                <div className="skill-progress">
                  <div
                    className="skill-progress-fill"
                    style={{ width: `${percent}%` }}
                  />
                  <div className="skill-progress-label">
                    {skill.exp} / {skill.exp_to_next}
                  </div>
                </div>
              </div>

              <div className="skill-level">
                Уровень {skill.level} / {skill.max_level}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default ProfilePage;