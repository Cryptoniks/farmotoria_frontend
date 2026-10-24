import { createContext, useContext, useMemo } from "react";
import { getLanguage, makeT } from "./core";

export const LanguageContext = createContext({ lang: getLanguage(), setLang: () => {} });

/** Текущий язык и его смена: { lang, setLang }. */
export const useLanguage = () => useContext(LanguageContext);

/** Функция перевода для текущего языка (см. makeT в core.js). */
export function useT() {
  const { lang } = useContext(LanguageContext);
  return useMemo(() => makeT(lang), [lang]);
}
