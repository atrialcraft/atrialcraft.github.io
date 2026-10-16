import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { PageTransition } from '@/components/PageTransition'
import { ScrollToTop } from '@/components/ScrollToTop'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Borders of the content column; the background stays the site colour */}
      <div className="pointer-events-none fixed inset-0 flex justify-center sm:px-8">
        <div className="flex w-full max-w-7xl lg:px-8">
          <div className="w-full sm:ring-1 sm:ring-secondary" />
        </div>
      </div>
      <div className="relative flex w-full flex-col overflow-x-clip">
        <Header />
        <main className="flex-auto">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
      </div>
      <ScrollToTop />
    </>
  )
}
