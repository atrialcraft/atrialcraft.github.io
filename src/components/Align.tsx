import { cn } from '@/lib/utils'

const classes = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/**
 * Aligns everything inside: <Align to="center">Текст</Align>
 * Keep blank lines around the text inside so Markdown still works in it.
 */
export function Align({
  to = 'center',
  children,
}: {
  to?: keyof typeof classes
  children: React.ReactNode
}) {
  return <div className={cn(classes[to])}>{children}</div>
}
