import { useCallback, useMemo, useState } from "react";
import { getLanguage, isLanguage, storeLanguage } from "./core";
import { LanguageContext } from "./context";

/** Язык интерфейса для всего приложения; смена сохраняется в браузере. */
export default function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getLanguage);

  const setLang = useCallback((code) => {
    if (!isLanguage(code)) return;
    storeLanguage(code);
    setLangState(code);
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
