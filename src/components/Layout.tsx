import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { PageTransition } from '@/components/PageTransition'
import { ProductTransition } from '@/components/ProductTransition'
import { ScrollToTop } from '@/components/ScrollToTop'
import { TestBanner } from '@/components/TestBanner'
import { showTestBanner } from '@/lib/site'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    // --banner-h shifts the header and content below the strip; 0 without it
    <div
      className="contents"
      style={
        { '--banner-h': showTestBanner ? '2rem' : '0px' } as React.CSSProperties
      }
    >
      {showTestBanner && <TestBanner />}
      {/* Content column on top of the darker side background, as in the original */}
      <div className="pointer-events-none fixed inset-0 flex justify-center sm:px-8">
        <div className="flex w-full max-w-7xl lg:px-8">
          <div className="w-full sm:bg-card sm:ring-1 sm:ring-secondary" />
        </div>
      </div>
      <div className="relative flex w-full flex-col overflow-x-clip pt-(--banner-h)">
        <Header />
        <main className="flex-auto">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
      </div>
      <ScrollToTop />
      <ProductTransition />
    </div>
  )
}
