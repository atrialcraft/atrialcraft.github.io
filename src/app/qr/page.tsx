import { SimpleLayout } from '@/components/SimpleLayout'
import { QrGeneratorLoader } from '@/components/qr/QrGeneratorLoader'
import { createPageMetadata } from '@/lib/metadata'

export const metadata = createPageMetadata({
  title: 'Генератор QR-кодов',
  description:
    'Бесплатный генератор QR-кодов со ссылкой, Wi-Fi, визиткой или текстом и логотипом в центре. SVG одним контуром для LightBurn и лазерной гравировки.',
  page: 'qr',
})

export default function QrPage() {
  return (
    <SimpleLayout
      title="Генератор QR-кодов"
      intro="Ссылка, Wi-Fi, визитка или текст — с логотипом в центре. SVG сохраняется одним контуром: его можно сразу открыть в LightBurn и отправить на лазер, без объединения в Illustrator."
    >
      <QrGeneratorLoader />
    </SimpleLayout>
  )
}
