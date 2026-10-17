import Link from 'next/link'

import { ContainerInner, ContainerOuter } from '@/components/Container'
import { MadeInBryanskLogo } from '@/components/MadeInBryanskLogo'

function NavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className="transition hover:text-accent">
      {children}
    </Link>
  )
}

export function Footer() {
  return (
    <footer className="mt-32 flex-none">
      <ContainerOuter>
        <div className="border-t border-border pt-10 pb-16">
          <ContainerInner>
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm font-medium text-foreground">
                <NavLink href="/about">Обо мне</NavLink>
                <NavLink href="/blog">Блог</NavLink>
                <NavLink href="/projects">Проекты</NavLink>
                <NavLink href="/market">Магазин</NavLink>
              </div>
              <MadeInBryanskLogo className="h-10 w-auto flex-none text-foreground" />
            </div>
            <p className="mt-8 text-center text-xs text-muted-foreground md:text-left">
              <Link
                href="/privacy"
                className="underline decoration-border underline-offset-4 transition hover:text-foreground"
              >
                Политика конфиденциальности
              </Link>
            </p>
            <p className="mt-2 text-center text-xs text-muted-foreground md:text-left">
              * Instagram принадлежит компании Meta, деятельность которой
              признана экстремистской и запрещена на территории России.
            </p>
          </ContainerInner>
        </div>
      </ContainerOuter>
    </footer>
  )
}
