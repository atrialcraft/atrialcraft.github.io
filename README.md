# Brian Ruiz

Personal site for [b-r.io](https://b-r.io) — portfolio, writing, projects, and gear.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [MDX](https://mdxjs.com) for writing
- [Tailwind CSS](https://tailwindcss.com) v4
- [Motion](https://motion.dev) for animation

## Getting started

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in values
3. `npm run dev`

## Deployment

The site is exported as static HTML (`output: 'export'`, built into `out/`) and deployed to GitHub Pages by [.github/workflows/deploy.yml](.github/workflows/deploy.yml) on every push to `main`.

In the repository settings: **Pages → Source → GitHub Actions**. Analytics IDs are set as repository variables (**Settings → Secrets and variables → Actions → Variables**).

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (OG, sitemap, RSS) |
| `NEXT_PUBLIC_YANDEX_METRIKA_ID` | Yandex Metrika counter ID (repo variable `YANDEX_METRIKA_ID`), optional |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 measurement ID, `G-…` (repo variable `GA_ID`), optional |
