import { Fragment } from 'react'

import { typograf } from '@/lib/typograf.mjs'

const linkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g

/**
 * Text written in the admin: paragraphs separated by an empty line, links
 * as [text](https://…). Typography is applied to the whole paragraph with
 * the links in place, so «в» before a link doesn't hang at the line end;
 * the addresses themselves are left as they are
 */
function renderInline(text: string, linkClassName: string) {
  let urls: string[] = []
  let marked = text.replace(linkPattern, (_, label: string, url: string) => {
    urls.push(url)
    return `[${label}](${urls.length - 1})`
  })
  let typed = typograf(marked)
  let parts: React.ReactNode[] = []
  let last = 0
  for (let match of typed.matchAll(/\[([^\]]+)\]\((\d+)\)/g)) {
    parts.push(typed.slice(last, match.index))
    let url = urls[Number(match[2])]
    let external = /^https?:\/\//.test(url)
    parts.push(
      <a
        key={match.index}
        href={url}
        className={linkClassName}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {match[1]}
      </a>,
    )
    last = match.index + match[0].length
  }
  parts.push(typed.slice(last))
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>)
}

/** Several paragraphs, each in its own <p> */
export function RichText({
  text,
  linkClassName = 'link-underline',
}: {
  text: string
  linkClassName?: string
}) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, i) => (
          <p key={i}>{renderInline(paragraph, linkClassName)}</p>
        ))}
    </>
  )
}

/** One line of text without a paragraph around it */
export function InlineText({
  text,
  linkClassName = 'link-underline',
}: {
  text: string
  linkClassName?: string
}) {
  return <>{renderInline(text.trim(), linkClassName)}</>
}
