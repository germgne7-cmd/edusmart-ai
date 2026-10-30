import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import kk from "./locales/kk.json";
import ru from "./locales/ru.json";
const language = localStorage.getItem("edusmart-language") || "kk";
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    kk: { translation: kk },
    ru: { translation: ru },
  },
  lng: language,
  fallbackLng: "kk",
  interpolation: { escapeValue: false },
});
i18n.on("languageChanged", (l) => {
  localStorage.setItem("edusmart-language", l);
  document.documentElement.lang = l;
});
document.documentElement.lang = language;
export default i18n;
