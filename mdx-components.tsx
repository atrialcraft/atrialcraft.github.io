import Image, { type ImageProps } from 'next/image'
import { type MDXComponents } from 'mdx/types'

import { Align } from '@/components/Align'
import { CodePre } from '@/components/CodePre'
import { CopyPrompt } from '@/components/CopyPrompt'
import { FileTree } from '@/components/FileTree'
import { ImageCarousel } from '@/components/ImageCarousel'
import { OgButton } from '@/components/OgButton'
import { OgLink } from '@/components/OgLink'
import { Photo } from '@/components/Photo'
import { YouTubeEmbed } from '@/components/YouTubeEmbed'

export function useMDXComponents(components: MDXComponents) {
  return {
    ...components,
    pre: CodePre,
    a: OgLink,
    OgLink,
    OgButton,
    Photo,
    Align,
    ImageCarousel,
    FileTree,
    CopyPrompt,
    YouTubeEmbed,
    // `alt` is already part of `ImageProps`
    // eslint-disable-next-line jsx-a11y/alt-text
    Image: (props: ImageProps) => <Image {...props} />,
  }
}
