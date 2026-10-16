import { InstagramIcon, TelegramIcon, VKIcon } from '@/components/SocialIcons'

export const site = {
  name: 'Daniil Kolbunov',
  title: 'Daniil Kolbunov — мастерская Atrial',
  description:
    'Мастерская Atrial: лазерная резка, 3D-печать, Arduino и другие проекты из Брянска.',
  domain: 'atrialcraft.github.io',
  locale: 'ru_RU',
}

export const homeHeroTitle =
  'Мастерская Atrial: лазерная резка, 3D-печать и Arduino.'

export const socialLinks = [
  {
    href: 'https://t.me/kolbunov',
    label: 'Написать в Telegram',
    icon: TelegramIcon,
  },
  {
    href: 'https://t.me/atrialcraft',
    label: 'Канал Atrial в Telegram',
    icon: TelegramIcon,
  },
  {
    href: 'https://instagram.com/atrialcraft',
    label: 'Atrial в Instagram',
    icon: InstagramIcon,
  },
  {
    href: 'https://vk.com/atrialcraft',
    label: 'Atrial во ВКонтакте',
    icon: VKIcon,
  },
]
