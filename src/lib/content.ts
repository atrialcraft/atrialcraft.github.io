// Texts and settings edited in the admin (Верстак): they live in
// src/content/*.json, the pages only read them.

import about from '@/content/about.json'
import home from '@/content/home.json'
import projects from '@/content/projects.json'
import sections from '@/content/sections.json'
import siteSettings from '@/content/site.json'

export type Place = {
  name: string
  description: string
  /** The place's own site or channel */
  href: string
  /** Yandex Maps link, opened from the address */
  map: string
  /** File in public/images/places */
  logo: string
}

export type ProjectItem = {
  name: string
  description: string
  href: string
  label: string
  /** File in public/images/projects, or empty for initials */
  logo: string
}

export const homeContent = home as {
  title: string
  intro: string
  /** Descriptions of the five photos in src/images/home, 01–05 */
  gallery: string[]
  places: Place[]
}

export const aboutContent = about as {
  title: string
  description: string
  /** Paragraphs separated by an empty line, links as [text](url) */
  text: string
}

export const projectsContent = projects as {
  title: string
  intro: string
  description: string
  items: ProjectItem[]
}

type Section = { title: string; intro: string; description: string }
export const sectionsContent = sections as {
  blog: Section
  instructions: Section
  market: Section
}

export const settings = siteSettings as {
  testBanner: boolean
  buyLinks: { telegram: string; vk: string }
  social: { telegram: string; instagram: string; vk: string }
}
