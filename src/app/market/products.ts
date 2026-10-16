import { type StaticImageData } from 'next/image'

import zlynka from '@/images/market/zlynka.jpeg'

export interface Product {
  name: string
  description: string
  /** Например '2 500 ₽'. Без цены на карточке будет «Цена по запросу» */
  price?: string
  /** Квадратное фото, лежит в src/images/market/ */
  image?: StaticImageData
}

export const products: Array<Product> = [
  {
    name: 'Наличник «Злынка»',
    description:
      'Наличник-зеркало из фанеры по мотивам деревянной архитектуры Злынки. Ставни на петлях открываются.',
    image: zlynka,
  },
  {
    name: 'Наличник «Климово»',
    description:
      'Наличник-зеркало из фанеры по мотивам деревянной архитектуры Климово.',
  },
  {
    name: 'Наличник «Новозыбков»',
    description:
      'Наличник-зеркало из фанеры по мотивам деревянной архитектуры Новозыбкова.',
  },
]
