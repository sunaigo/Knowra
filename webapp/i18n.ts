import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN/common.json'
import en from './locales/en/common.json'

// 检测浏览器语言，优先支持zh-CN和en
function detectDefaultLang() {
  if (typeof window !== 'undefined') {
    const lang = navigator.language || navigator.languages?.[0] || 'zh-CN'
    if (lang.toLowerCase().startsWith('zh')) return 'zh-CN'
    if (lang.toLowerCase().startsWith('en')) return 'en'
  }
  return 'zh-CN'
}

const defaultLang = typeof window === 'undefined' ? 'zh-CN' : detectDefaultLang()

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { common: zhCN },
      en: { common: en },
    },
    lng: defaultLang,
    fallbackLng: 'zh-CN',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })

export default i18n 