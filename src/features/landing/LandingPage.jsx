import { useState } from "react";
import { api } from "../../shared/services/api";
import { buildingIcons } from "../../assets/buildings";
import logo from "../../assets/logo.svg";
import "./LandingPage.css";

const FEATURES = [
  { icon: buildingIcons.mill, title: "Выращивайте", text: "Сажайте пшеницу, кукурузу, подсолнечник и ещё полдюжины культур, собирайте урожай." },
  { icon: buildingIcons.blacksmith, title: "Производите", text: "Лесопилка, кузница, пекарня и заводы превращают сырьё в товары подороже." },
  { icon: buildingIcons.cowshed, title: "Разводите", text: "Куры, свиньи, коровы и овцы дают яйца, мясо, молоко и шерсть." },
  { icon: buildingIcons.market, title: "Торгуйте", text: "Продавайте на Рынке, покупайте в Магазине, расширяйте землю и улучшайте здания." },
];

const errorText = (err, fallback) => {
  const data = err?.response?.data;
  if (!data) return "Нет связи с сервером. Попробуйте ещё раз";
  if (data.detail) return err.response.status === 401 ? "Неверный логин или пароль" : data.detail;
  const parts = Object.entries(data).map(([field, msg]) => {
    const name = { username: "Логин", email: "Email", password: "Пароль" }[field] || field;
    return `${name}: ${[].concat(msg).join(" ")}`;
  });
  return parts.join(" • ") || fallback;
};

/** Вход и регистрация вкладками. После регистрации — сразу вход в игру. */
function AuthCard({ onLoginSuccess }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [status, setStatus] = useState({ text: "", error: false });
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const login = async (username, password) => {
    const res = await api.post("/api/auth/token/", { username, password });
    localStorage.setItem("access", res.data.access);
    localStorage.setItem("refresh", res.data.refresh);
    onLoginSuccess?.();
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setStatus({ text: "", error: false });
    try {
      if (tab === "register") {
        await api.post("/api/auth/register/", form);
      }
      await login(form.username, form.password);
    } catch (err) {
      setStatus({ text: errorText(err, tab === "register" ? "Ошибка регистрации" : "Ошибка входа"), error: true });
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button className={tab === "login" ? "active" : ""} onClick={() => setTab("login")} type="button">Вход</button>
        <button className={tab === "register" ? "active" : ""} onClick={() => setTab("register")} type="button">Регистрация</button>
      </div>
      <form onSubmit={submit} className="auth-form">
        <label>
          Логин
          <input value={form.username} onChange={set("username")} required autoComplete="username" />
        </label>
        {tab === "register" && (
          <label>
            Email <span className="auth-optional">(необязательно)</span>
            <input type="email" value={form.email} onChange={set("email")} autoComplete="email" />
          </label>
        )}
        <label>
          Пароль
          <input type="password" value={form.password} onChange={set("password")} required
            autoComplete={tab === "register" ? "new-password" : "current-password"} />
        </label>
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Секунду…" : tab === "register" ? "Создать ферму" : "Войти в игру"}
        </button>
        {status.text && <div className={`auth-status ${status.error ? "error" : ""}`}>{status.text}</div>}
        <div className="auth-hint">
          {tab === "login"
            ? <>Ещё нет фермы? <button type="button" className="auth-link" onClick={() => setTab("register")}>Зарегистрируйтесь</button></>
            : <>Уже играете? <button type="button" className="auth-link" onClick={() => setTab("login")}>Войдите</button></>}
        </div>
      </form>
    </div>
  );
}

export default function LandingPage({ onLoginSuccess }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <img src={logo} alt="Farmotoria" className="landing-logo" />
      </header>

      <main className="landing-main">
        <section className="landing-intro">
          <h1>Своя ферма — с нуля до большого хозяйства</h1>
          <p>
            Начните с небольшого участка, Сарая и одного поля. Сажайте культуры, собирайте урожай, стройте
            мастерские и заводы, разводите животных, расширяйте землю и улучшайте здания. Спокойная фермерская
            стратегия, где важно не кликать, а планировать.
          </p>
          <div className="landing-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="landing-feature">
                <img src={f.icon} alt="" />
                <div>
                  <div className="landing-feature-title">{f.title}</div>
                  <div className="landing-feature-text">{f.text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="landing-auth">
          <AuthCard onLoginSuccess={onLoginSuccess} />
        </aside>
      </main>

      <footer className="landing-footer">© {new Date().getFullYear()} Farmotoria</footer>
    </div>
  );
}
