'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { bouncy, dragSpring, dragTransition } from '@/lib/transitions'
import { PhotoCard } from '@/components/PhotoCard'

import elektromaImage from '@/images/photos/elektroma.jpg'
import nalichnikImage from '@/images/photos/nalichnik.jpg'
import onAirImage from '@/images/photos/on-air.jpg'
import organajzerImage from '@/images/photos/organajzer.jpg'
import pechkaImage from '@/images/photos/pechka.jpg'

const photos = [
  {
    image: elektromaImage,
    alt: 'Часы на газоразрядных индикаторах ИН-12Б',
    caption: 'часы «Электрома» на ИН-12Б',
    filename: 'elektroma.jpg',
  },
  {
    image: pechkaImage,
    alt: 'Сварка корпуса печки-буржуйки',
    caption: 'буржуйка из стали 5 мм',
    filename: 'pechka.jpg',
  },
  {
    image: nalichnikImage,
    alt: 'Раскрашенный наличник-зеркало «Злынка»',
    caption: 'наличник «Злынка»',
    filename: 'nalichnik.jpg',
  },
  {
    image: onAirImage,
    alt: 'Световое табло ON AIR',
    caption: 'табло ON AIR',
    filename: 'on-air.jpg',
  },
  {
    image: organajzerImage,
    alt: 'Органайзер в стиле IKEA Skådis в цветочном магазине',
    caption: 'органайзер для Candy',
    filename: 'organajzer.jpg',
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
            className="flex cursor-grab gap-5 will-change-transform active:cursor-grabbing"
          >
            {cards}
          </motion.div>
        </div>
      ) : (
        <div
          className="-my-4 flex justify-center gap-5 overflow-visible py-4 sm:gap-8"
        >
          {cards}
        </div>
      )}
    </div>
  )
}
