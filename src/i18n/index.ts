import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import nbCommon from '../../public/locales/nb/common.json'
import nbAuth from '../../public/locales/nb/auth.json'
import nbJanitor from '../../public/locales/nb/janitor.json'
import nbManager from '../../public/locales/nb/manager.json'
import nbCustomer from '../../public/locales/nb/customer.json'

import enCommon from '../../public/locales/en/common.json'
import enAuth from '../../public/locales/en/auth.json'
import enJanitor from '../../public/locales/en/janitor.json'
import enManager from '../../public/locales/en/manager.json'
import enCustomer from '../../public/locales/en/customer.json'

export const defaultNS = 'common'
export const supportedLanguages = ['nb', 'en'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

i18n.use(initReactI18next).init({
  defaultNS,
  ns: ['common', 'auth', 'janitor', 'manager', 'customer'],
  resources: {
    nb: {
      common: nbCommon,
      auth: nbAuth,
      janitor: nbJanitor,
      manager: nbManager,
      customer: nbCustomer,
    },
    en: {
      common: enCommon,
      auth: enAuth,
      janitor: enJanitor,
      manager: enManager,
      customer: enCustomer,
    },
  },
  lng: 'nb',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
