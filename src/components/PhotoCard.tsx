'use client'

import Image, { type StaticImageData } from 'next/image'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'
import { bouncy } from '@/lib/transitions'

type PhotoCardProps = {
  image: StaticImageData
  alt: string
  objectPosition?: string
  aspectClassName?: string
  className?: string
  rotationClassName?: string
  sizes?: string
  quality?: number
  index?: number
}

export function PhotoCard({
  image,
  alt,
  objectPosition,
  aspectClassName = 'aspect-[4/5]',
  className,
  rotationClassName,
  sizes = '(min-width: 640px) 18rem, 11rem',
  quality,
  index = 0,
}: PhotoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        ...bouncy({ duration: 0.6, extraBounce: 0.15 }),
        delay: index * 0.1,
      }}
      className={cn(
        'relative z-30 w-44 flex-none overflow-hidden rounded-xl bg-muted select-none sm:w-72 sm:rounded-2xl',
        rotationClassName,
        className,
      )}
    >
      <div className={cn('relative', aspectClassName)}>
        <Image
          src={image}
          alt={alt}
          fill
          sizes={sizes}
          quality={quality}
          className="pointer-events-none object-cover"
          style={{ objectPosition: objectPosition ?? 'center' }}
          draggable={false}
        />
      </div>
    </motion.div>
  )
}
