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

/** Куда ведёт кнопка «Купить»: личные сообщения канала и сообщества ВК */
export const buyLinks = {
  telegram: 'https://t.me/atrialcraft?direct',
  vk: 'https://vk.me/atrialcraft',
}

export const homeHeroTitle = 'Творческое убежище брянского энтузиаста'

export const socialLinks = [
  {
    href: 'https://t.me/atrialcraft',
    label: 'Atrial в Telegram',
    icon: TelegramIcon,
  },
  {
    href: 'https://instagram.com/atrialcraft',
    // * — see the Meta note in the footer
    label: 'Atrial в Instagram*',
    icon: InstagramIcon,
  },
  {
    href: 'https://vk.com/atrialcraft',
    label: 'Atrial во ВКонтакте',
    icon: VKIcon,
  },
]
