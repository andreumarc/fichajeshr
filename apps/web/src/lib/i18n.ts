import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from '../i18n/es.json';
import ca from '../i18n/ca.json';
import gl from '../i18n/gl.json';
import en from '../i18n/en.json';

const LANG_KEY = 'fichaje_lang';

function getInitialLang(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(LANG_KEY) ?? 'es';
  }
  return 'es';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      ca: { translation: ca },
      gl: { translation: gl },
      en: { translation: en },
    },
    lng: getInitialLang(),
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  });

export { LANG_KEY };
export default i18n;
