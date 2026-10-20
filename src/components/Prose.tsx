import { typografChildren } from '@/lib/typography'
import { cn } from '@/lib/utils'

export function Prose({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn(className, 'prose dark:prose-invert')} {...props}>
      {/* Text written in TSX; MDX pages get the same rules from remark-typograf */}
      {typografChildren(children)}
    </div>
  )
}
