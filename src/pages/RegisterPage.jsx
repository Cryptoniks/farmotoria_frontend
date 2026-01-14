import { useState } from "react";
import { api } from "../api";
import "../styles/RegisterPage.css";

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Отправка...");

    try {
      await api.post("/api/auth/register/", {
        username,
        email,
        password,
      });
      setStatus("Регистрация успешна. Теперь можно войти.");
    } catch (err) {
      console.error(err);

      if (err.response && err.response.data) {
        const data = err.response.data;
        const messages = [];

        if (data.username) {
          messages.push(`Логин: ${data.username.join(" ")}`);
        }
        if (data.email) {
          messages.push(`Email: ${data.email.join(" ")}`);
        }
        if (data.password) {
          messages.push(
            "Слишком короткий пароль, введите не менее 6 символов"
          );
        }

        if (messages.length > 0) {
          setStatus(messages.join(" | "));
        } else {
          setStatus("Ошибка регистрации.");
        }
      } else {
        setStatus("Ошибка регистрации (нет связи с сервером).");
      }
    }
  };

  return (
    <div className="register-page">
      <h2>Регистрация игрока</h2>

      <form className="register-form" onSubmit={handleSubmit}>
        <div className="register-form-group">
          <label>Логин</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="register-form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="register-form-group">
          <label>Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit">Зарегистрироваться</button>
      </form>

      {status && <p className="register-status">{status}</p>}
    </div>
  );
}

export default RegisterPage;