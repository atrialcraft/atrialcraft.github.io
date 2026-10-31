import { SimpleLayout } from '@/components/SimpleLayout'
import { NalichnikColorsLoader } from '@/components/nalichnik/NalichnikColorsLoader'
import { createPageMetadata } from '@/lib/metadata'

export const metadata = createPageMetadata({
  title: 'Подбор цвета наличника',
  description: 'Раскрасьте резной брянский наличник в 3D и подберите цвета под свой дом: бревно, брус, вагонка, кирпич или штукатурка.',
  page: 'colors',
})

export default function ColorPickerPage() {
  return (
    <SimpleLayout
      title="Подбор цвета наличника"
      intro="Выберите деталь в списке или прямо на модели, потом цвет. Стену за окном тоже можно поменять — на бревне и на кирпиче цвета смотрятся по-разному."
    >
      <NalichnikColorsLoader />
    </SimpleLayout>
  )
}
