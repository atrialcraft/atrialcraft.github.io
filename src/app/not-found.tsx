import { Button } from '@/components/Button'
import { Container } from '@/components/Container'

export default function NotFound() {
  return (
    <Container className="flex h-full items-center pt-16 sm:pt-32">
      <div className="flex flex-col items-center">
        {/* Looped forward-then-back, so there is no visible seam. A muted
            video instead of a GIF: 160 KB instead of several megabytes */}
        <video
          src="/404-cat.mp4"
          poster="/404-cat.webp"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
          className="w-full max-w-xs rounded-2xl bg-muted sm:max-w-sm"
          width={640}
          height={480}
        />
        <p className="sr-only">404</p>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl">
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
