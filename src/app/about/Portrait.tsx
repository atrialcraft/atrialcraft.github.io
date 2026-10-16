'use client'

import portraitImage from '@/images/photos/me.jpg'
import { PhotoCard } from '@/components/PhotoCard'

export function Portrait() {
  return (
    <div className="max-w-[19.25rem] px-2.5 lg:max-w-none">
      <PhotoCard
        image={portraitImage}
        alt="Даниил Колбунов"
        caption="Даниил, Брянск"
        filename="me.jpg"
        sizes="(min-width: 1024px) 32rem, 18rem"
        quality={100}
        aspectClassName="aspect-[4/5]"
        className="w-full sm:w-full"
        rotationClassName="rotate-3"
      />
    </div>
  )
}
