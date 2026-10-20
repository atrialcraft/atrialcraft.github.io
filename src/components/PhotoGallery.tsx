'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { bouncy, dragSpring, dragTransition } from '@/lib/transitions'
import { PhotoCard } from '@/components/PhotoCard'

// Photos go in src/images/home/ as 01.webp, 02.webp… in the order shown
import photo01 from '@/images/home/01.webp'
import photo02 from '@/images/home/02.webp'
import photo03 from '@/images/home/03.webp'
import photo04 from '@/images/home/04.webp'
import photo05 from '@/images/home/05.webp'

const photos = [
  {
    image: photo01,
    alt: 'Часы на газоразрядных индикаторах ИН-12Б',
  },
  {
    image: photo02,
    alt: 'Сварка корпуса печки-буржуйки',
  },
  {
    image: photo03,
    alt: 'Раскрашенный наличник-зеркало «Злынка»',
  },
  {
    image: photo04,
    alt: 'Световое табло ON AIR',
  },
  {
    image: photo05,
    alt: 'Органайзер в стиле IKEA Skådis в цветочном магазине',
  },
]

const rotations = ['rotate-2', '-rotate-2', 'rotate-2', 'rotate-2', '-rotate-2']

export function PhotoGallery() {
  const [isMobile, setIsMobile] = useState(false)
  const [width, setWidth] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!isMobile || !carouselRef.current) return

    const updateWidth = () => {
      if (carouselRef.current) {
        setWidth(
          carouselRef.current.scrollWidth - carouselRef.current.offsetWidth,
        )
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [isMobile])

  const cards = photos.map((photo, imageIndex) => (
    <PhotoCard
      key={photo.image.src}
      {...photo}
      index={imageIndex}
      rotationClassName={rotations[imageIndex % rotations.length]}
    />
  ))

  return (
    <div className="mt-16 sm:mt-20">
      {isMobile ? (
        <div className="relative -my-4 overflow-hidden py-4">
          <motion.div
            ref={carouselRef}
            drag="x"
            dragElastic={0.15}
            dragConstraints={{ right: 0, left: -width }}
            dragTransition={dragTransition}
            transition={dragSpring}
            className="flex cursor-grab gap-5 will-change-transform select-none active:cursor-grabbing"
          >
            {cards}
          </motion.div>
        </div>
      ) : (
        <div className="-my-4 flex justify-center gap-5 overflow-visible py-4 sm:gap-8">
          {cards}
        </div>
      )}
    </div>
  )
}
