import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "../styles/LoginPage.css";

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Отправка...");

    try {
      const res = await api.post("/api/auth/token/", {
        username,
        password,
      });

      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);

      setStatus("Вход выполнен.");
      onLoginSuccess?.();
      navigate("/profile");
    } catch (err) {
      console.error(err);
      setStatus("Ошибка входа");
    }
  };

  return (
    <div className="login-page">
      <h2>Вход</h2>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-form-group">
          <label>Логин</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="login-form-group">
          <label>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit">Войти</button>
      </form>

      {status && <p className="login-status">{status}</p>}
    </div>
  );
}

export default LoginPage;