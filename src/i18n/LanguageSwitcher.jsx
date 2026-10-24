import { LANGUAGES } from "./core";
import { useLanguage } from "./context";
import "./LanguageSwitcher.css";

/** Переключатель языка RU · EN · ES. onChange — например, сохранить язык в профиле игрока. */
export default function LanguageSwitcher({ onChange, className = "" }) {
  const { lang, setLang } = useLanguage();
  const choose = (code) => {
    if (code === lang) return;
    setLang(code);
    onChange?.(code);
  };
  return (
    <div className={`lang-switcher ${className}`} role="group" aria-label="Language">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`lang-btn ${l.code === lang ? "active" : ""}`}
          onClick={() => choose(l.code)}
          title={l.name}
          aria-pressed={l.code === lang}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
