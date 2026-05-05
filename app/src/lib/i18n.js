import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import nb from '../../public/locales/nb/translation.json'
import en from '../../public/locales/en/translation.json'
import fa from '../../public/locales/fa/translation.json'

const lng = localStorage.getItem('wl-lang') || 'nb'
document.documentElement.dir = lng === 'fa' ? 'rtl' : 'ltr'

i18n.use(initReactI18next).init({
  resources: {
    nb: { translation: nb },
    en: { translation: en },
    fa: { translation: fa },
  },
  lng,
  fallbackLng: 'nb',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (l) => {
  document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr'
})

export default i18n
