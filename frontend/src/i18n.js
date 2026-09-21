import en from './locales/en/translation.json'
import hi from './locales/hi/translation.json'

const dictionaries = { en, hi }

export function currentLanguage() {
  return localStorage.getItem('cc_lang') || 'en'
}

export function t(key) {
  const lang = currentLanguage()
  return dictionaries[lang]?.[key] || dictionaries.en[key] || key
}
