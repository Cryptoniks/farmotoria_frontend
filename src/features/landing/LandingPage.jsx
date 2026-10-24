import { useState } from "react";
import LanguageSwitcher from "../../i18n/LanguageSwitcher";
import { useT } from "../../i18n/context";
import { api } from "../../shared/services/api";
import { buildingIcons } from "../../assets/buildings";
import logo from "../../assets/logo.svg";
import "./LandingPage.css";

const FEATURES = [
  { icon: buildingIcons.mill, key: "grow" },
  { icon: buildingIcons.blacksmith, key: "produce" },
  { icon: buildingIcons.cowshed, key: "breed" },
  { icon: buildingIcons.market, key: "trade" },
];

const errorText = (t, err, fallback) => {
  const data = err?.response?.data;
  if (!data) return t("auth.noConnection");
  if (data.detail) return err.response.status === 401 ? t("auth.badCredentials") : data.detail;
  const parts = Object.entries(data).map(([field, msg]) => {
    const name = { username: t("auth.username"), email: t("auth.email"), password: t("auth.password") }[field] || field;
    return `${name}: ${[].concat(msg).join(" ")}`;
  });
  return parts.join(" • ") || fallback;
};

/** Вход и регистрация вкладками. После регистрации — сразу вход в игру. */
function AuthCard({ onLoginSuccess }) {
  const t = useT();
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
      setStatus({ text: errorText(t, err, t(tab === "register" ? "auth.registerError" : "auth.loginError")), error: true });
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button className={tab === "login" ? "active" : ""} onClick={() => setTab("login")} type="button">{t("auth.login")}</button>
        <button className={tab === "register" ? "active" : ""} onClick={() => setTab("register")} type="button">{t("auth.register")}</button>
      </div>
      <form onSubmit={submit} className="auth-form">
        <label>
          {t("auth.username")}
          <input value={form.username} onChange={set("username")} required autoComplete="username" />
        </label>
        {tab === "register" && (
          <label>
            {t("auth.email")} <span className="auth-optional">{t("auth.optional")}</span>
            <input type="email" value={form.email} onChange={set("email")} autoComplete="email" />
          </label>
        )}
        <label>
          {t("auth.password")}
          <input type="password" value={form.password} onChange={set("password")} required
            autoComplete={tab === "register" ? "new-password" : "current-password"} />
        </label>
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? t("auth.wait") : tab === "register" ? t("auth.createFarm") : t("auth.enter")}
        </button>
        {status.text && <div className={`auth-status ${status.error ? "error" : ""}`}>{status.text}</div>}
        <div className="auth-hint">
          {tab === "login"
            ? <>{t("auth.noFarm")} <button type="button" className="auth-link" onClick={() => setTab("register")}>{t("auth.signUpLink")}</button></>
            : <>{t("auth.alreadyPlaying")} <button type="button" className="auth-link" onClick={() => setTab("login")}>{t("auth.logInLink")}</button></>}
        </div>
      </form>
    </div>
  );
}

export default function LandingPage({ onLoginSuccess }) {
  const t = useT();
  return (
    <div className="landing">
      <header className="landing-header">
        <img src={logo} alt="Farmotoria" className="landing-logo" />
        <LanguageSwitcher />
      </header>

      <main className="landing-main">
        <section className="landing-intro">
          <h1>{t("landing.title")}</h1>
          <p>{t("landing.intro")}</p>
          <div className="landing-features">
            {FEATURES.map((f) => (
              <div key={f.key} className="landing-feature">
                <img src={f.icon} alt="" />
                <div>
                  <div className="landing-feature-title">{t(`landing.feature.${f.key}.title`)}</div>
                  <div className="landing-feature-text">{t(`landing.feature.${f.key}.text`)}</div>
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
