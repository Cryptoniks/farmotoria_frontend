// Мультиязычность: словари, выбор языка, перевод и форматирование.
//
// Тексты лежат в ru.js / en.js / es.js: ключ → строка, подстановки — {name}.
// Нет перевода — берётся русский, нет и его — сам ключ (так пропуск сразу виден).
// Язык: сохранённый в браузере → язык браузера (если он среди трёх) → русский.
// После входа язык берётся из профиля игрока, чтобы на любом устройстве был тот же.
import en from "./en";
import es from "./es";
import ru from "./ru";

export const LANGUAGES = [
  { code: "ru", label: "RU", name: "Русский" },
  { code: "en", label: "EN", name: "English" },
  { code: "es", label: "ES", name: "Español" },
];

const DICTS = { ru, en, es };
const LOCALES = { ru: "ru-RU", en: "en-US", es: "es-ES" };
const STORAGE_KEY = "lang";

export const isLanguage = (code) => Boolean(DICTS[code]);

function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    /* хранилище недоступно — смотрим на браузер */
  }
  const preferred = (navigator.languages || [navigator.language]).map((l) => (l || "").slice(0, 2).toLowerCase());
  return preferred.find(isLanguage) || "ru";
}

// Текущий язык нужен и вне React — для заголовка Accept-Language в запросах к серверу
let current = detectLanguage();
if (typeof document !== "undefined") document.documentElement.lang = current;

export const getLanguage = () => current;

export function storeLanguage(code) {
  current = code;
  document.documentElement.lang = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* не сохранилось — язык продержится до перезагрузки */
  }
}

export function translate(lang, key, params) {
  let text = DICTS[lang]?.[key] ?? ru[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) text = text.replaceAll(`{${name}}`, value);
  }
  return text;
}

export const localeOf = (lang) => LOCALES[lang] || LOCALES.ru;

/**
 * Функция перевода для языка: t("bank.title"), t("bank.got", { coins: 1000 });
 * t.num(1234) и t.date(value, options) — числа и даты в формате языка; t.lang — код языка.
 */
export function makeT(lang) {
  const locale = localeOf(lang);
  const unit = (key) => translate(lang, key);
  return Object.assign((key, params) => translate(lang, key, params), {
    lang,
    num: (n) => (n ?? 0).toLocaleString(locale),
    date: (value, options) => new Date(value).toLocaleString(locale, options),
    // Оставшееся время: «1ч 2м 3с» / «1h 2m 3s»; нули слева не показываются
    duration: (ms) => {
      const total = Math.max(0, Math.ceil(ms / 1000));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (h > 0) return `${h}${unit("time.h")} ${m}${unit("time.m")} ${s}${unit("time.s")}`;
      if (m > 0) return `${m}${unit("time.m")} ${s}${unit("time.s")}`;
      return `${s}${unit("time.s")}`;
    },
    // Длительность рецепта: «5 мин» / «45 сек»
    minutes: (seconds) => (seconds >= 60 ? `${Math.floor(seconds / 60)} ${unit("time.min")}` : `${seconds} ${unit("time.sec")}`),
  });
}
