import { InstagramIcon, TelegramIcon, VKIcon } from '@/components/SocialIcons'

export const site = {
  name: 'Daniil Kolbunov',
  /** Название сайта: заголовок вкладки на главной и в конце заголовков страниц */
  brand: 'Atrial',
  title: 'Atrial — Творческое убежище брянского энтузиаста',
  description:
    'Мастерская Atrial: лазерная резка, 3D-печать, Arduino и другие проекты из Брянска.',
  domain: 'atrial.org',
  locale: 'ru_RU',
}

/** Оператор персональных данных — для политики конфиденциальности */
export const operator = {
  name: 'Колбунов Даниил',
  /** Email для запросов по персональным данным */
  email: '',
}

// Links and switches edited in the admin: src/content/site.json
import { homeContent, settings } from '@/lib/content'

/** Куда ведёт кнопка «Купить»: личные сообщения канала и сообщества ВК */
export const buyLinks = settings.buyLinks

/** Yellow «тестовая версия» strip at the top of every page */
export const showTestBanner = settings.testBanner

export const homeHeroTitle = homeContent.title

export const socialLinks = [
  {
    href: settings.social.telegram,
    label: 'Atrial в Telegram',
    icon: TelegramIcon,
  },
  {
    href: settings.social.instagram,
    // * — see the Meta note in the footer
    label: 'Atrial в Instagram*',
    icon: InstagramIcon,
  },
  {
    href: settings.social.vk,
    label: 'Atrial во ВКонтакте',
    icon: VKIcon,
  },
]
