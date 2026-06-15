import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "@/locales/en.json";
import ar from "@/locales/ar.json";
import fr from "@/locales/fr.json";

export const SUPPORTED_LANGS = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "fr", label: "Français", dir: "ltr" },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ar: { translation: ar }, fr: { translation: fr } },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
  });

const applyDir = (lng: string) => {
  const lang = SUPPORTED_LANGS.find((l) => l.code === lng);
  document.documentElement.dir = lang?.dir ?? "ltr";
  document.documentElement.lang = lng;
};
applyDir(i18n.language);
i18n.on("languageChanged", applyDir);

export default i18n;
