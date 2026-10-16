# Daniil Kolbunov — мастерская Atrial

Личный сайт [atrialcraft.github.io](https://atrialcraft.github.io): записи, инструкции, проекты и магазин мастерской.

## Стек

- [Next.js](https://nextjs.org) (App Router) + TypeScript, статический экспорт
- [MDX](https://mdxjs.com) для записей
- [Tailwind CSS](https://tailwindcss.com) v4
- [Motion](https://motion.dev) для анимаций

## Запуск

1. `npm install`
2. Скопировать `.env.example` в `.env.local` и заполнить
3. `npm run dev` и открыть http://localhost:3000

## Что где редактируется

| Что | Где |
| --- | --- |
| Имя, заголовок и описание сайта, соцсети | [src/lib/site.ts](src/lib/site.ts) |
| Главная: текст под заголовком, блок «Опыт» | [src/app/page.tsx](src/app/page.tsx) |
| Фото в карусели на главной | [src/components/PhotoGallery.tsx](src/components/PhotoGallery.tsx), файлы в `src/images/photos/` |
| Аватар в шапке | `src/images/avatar.png` |
| Обо мне: текст | [src/app/about/page.tsx](src/app/about/page.tsx) |
| Обо мне: портрет | [src/app/about/Portrait.tsx](src/app/about/Portrait.tsx), файл `src/images/photos/me.jpeg` |
| Статьи и видео | `src/app/writing/<адрес>/page.mdx` → `/writing/<адрес>` |
| Инструкции (для QR-кодов) | `src/app/instructions/<адрес>/page.mdx` → `/instructions/<адрес>`, пример — `/instructions/kak-dobavit-zapis` |
| Проекты | [src/app/projects/page.tsx](src/app/projects/page.tsx), массив `projects` |
| Магазин: товары | `src/app/market/<адрес>/page.mdx` → `/market/<адрес>`, фото товара `photo.jpeg` в той же папке |
| Пункты меню | [src/components/Header.tsx](src/components/Header.tsx), [src/components/Footer.tsx](src/components/Footer.tsx) |
| Иконки сайта (вкладка, iPhone, Android) | см. раздел «Иконки» ниже |
| Цвета и шрифты | [src/styles/tailwind.css](src/styles/tailwind.css) |

### Поля товара

```js
export const product = {
  name: 'Наличник «Злынка»',
  description: 'Коротко, для карточки в магазине',
  price: 2500, // в рублях; без цены — «Цена по запросу»
  image: photo, // import photo from './photo.jpeg'
  instruction: '/instructions/zlynka', // необязательно: кнопка «Инструкция»
  order: 1, // порядок в магазине
}
```

Ниже шапки — подробное описание обычным Markdown.

### Поля записи

```js
export const post = {
  type: 'article', // 'article' | 'video' | 'instruction'
  author: 'Daniil Kolbunov',
  date: '2026-10-16',
  title: 'Заголовок',
  description: 'Описание',
  youtubeId: '...', // только для видео
  coverImage: '...', // необязательно
  visibility: 'public', // 'unlisted' — только по прямой ссылке
  showOnHome: true, // false — не показывать на главной
}
```

## Иконки

Все иконки делаются из одного квадратного логотипа (сейчас это `src/images/avatar.png`). При замене логотипа нужно заменить все файлы из таблицы; имена и размеры должны остаться такими же.

| Файл | Размер | Где видно | Требования |
| --- | --- | --- | --- |
| `src/app/favicon.ico` | 16×16, 32×32, 48×48 в одном файле | вкладка браузера, закладки, поиск Яндекса и Google | можно с прозрачностью |
| `src/app/icon.png` | 512×512 | вкладка в современных браузерах | PNG, можно с прозрачностью |
| `src/app/apple-icon.png` | 180×180 | iPhone и iPad: «На экран „Домой“» | PNG **без прозрачности**: iOS сама скругляет углы, а прозрачные места становятся чёрными |
| `public/icons/icon-192.png` | 192×192 | Android: ярлык на главном экране | PNG, можно с прозрачностью |
| `public/icons/icon-512.png` | 512×512 | Android: экран загрузки; превью для соцсетей и RSS | PNG, можно с прозрачностью |
| `public/icons/icon-maskable-512.png` | 512×512 | Android: ярлык в форме круга, капли и т. д. | PNG без прозрачности, логотип в центральных 80%: края Android обрезает |

Файлы в `src/app/` Next.js подключает сам, отдельно прописывать их не нужно. Название, цвета и иконки для Android задаются в [src/app/manifest.ts](src/app/manifest.ts), цвет адресной строки в мобильных браузерах — `viewport` в [src/app/layout.tsx](src/app/layout.tsx).

Сгенерировать весь набор из одной картинки можно на [realfavicongenerator.net](https://realfavicongenerator.net), а потом разложить файлы по путям из таблицы.

## Деплой

Сайт собирается в статический HTML (`output: 'export'`, папка `out/`) и выкладывается на GitHub Pages workflow-ом [.github/workflows/deploy.yml](.github/workflows/deploy.yml) при каждом push в `main`.

В настройках репозитория: **Pages → Source → GitHub Actions**. ID аналитики задаются в **Settings → Secrets and variables → Actions → Variables**.

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Адрес сайта (OG, sitemap, RSS) |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | Номер счётчика Яндекс Метрики (переменная репозитория `YANDEX_METRIKA_ID`), необязательно |
| `NEXT_PUBLIC_GA_ID` | ID Google Analytics 4, `G-…` (переменная репозитория `GA_ID`), необязательно |
