import { Button } from '@/components/Button'
import { Container } from '@/components/Container'

export default function NotFound() {
  return (
    <Container className="flex h-full items-center pt-16 sm:pt-32">
      <div className="flex flex-col items-center">
        <p className="text-base font-semibold text-muted-foreground">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl">
          Страница не найдена
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Такой страницы нет. Возможно, ссылка устарела или в ней опечатка.
        </p>
        <Button href="/" variant="secondary" className="mt-4">
          На главную
        </Button>
      </div>
    </Container>
  )
}
