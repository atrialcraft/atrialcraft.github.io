import { EyeIcon } from '@heroicons/react/24/outline'

import { cn } from '@/lib/utils'
import { formatViews, getViews } from '@/lib/views'

/** «👁 1 234» for a page, or nothing if there are no stats yet */
export function ViewsCount({
  href,
  className,
}: {
  href: string
  className?: string
}) {
  let views = getViews(href)
  if (!views) {
    return null
  }

  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      title="Просмотры"
    >
      <EyeIcon className="size-4" aria-hidden />
      <span className="sr-only">Просмотры:</span>
      {formatViews(views)}
    </span>
  )
}
