# Daniil Kolbunov — мастерская Atrial

Личный сайт [atrialcraft.github.io](https://atrialcraft.github.io): записи, проекты и оборудование мастерской.

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
| Оборудование | [src/app/gear/tools.ts](src/app/gear/tools.ts) |
| Пункты меню | [src/components/Header.tsx](src/components/Header.tsx), [src/components/Footer.tsx](src/components/Footer.tsx) |
| Иконка сайта | `public/favicon/` |
| Цвета и шрифты | [src/styles/tailwind.css](src/styles/tailwind.css) |

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

## Деплой

Сайт собирается в статический HTML (`output: 'export'`, папка `out/`) и выкладывается на GitHub Pages workflow-ом [.github/workflows/deploy.yml](.github/workflows/deploy.yml) при каждом push в `main`.

В настройках репозитория: **Pages → Source → GitHub Actions**. ID аналитики задаются в **Settings → Secrets and variables → Actions → Variables**.

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Адрес сайта (OG, sitemap, RSS) |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | Номер счётчика Яндекс Метрики (переменная репозитория `YANDEX_METRIKA_ID`), необязательно |
| `NEXT_PUBLIC_GA_ID` | ID Google Analytics 4, `G-…` (переменная репозитория `GA_ID`), необязательно |
