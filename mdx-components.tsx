import Image, { type ImageProps } from 'next/image'
import { type MDXComponents } from 'mdx/types'

import { Align } from '@/components/Align'
import { CodePre } from '@/components/CodePre'
import { OgButton } from '@/components/OgButton'
import { OgLink } from '@/components/OgLink'
import { Photo } from '@/components/Photo'

export function useMDXComponents(components: MDXComponents) {
  return {
    ...components,
    pre: CodePre,
    a: OgLink,
    OgLink,
    OgButton,
    Photo,
    Align,
    // `alt` is already part of `ImageProps`
    // eslint-disable-next-line jsx-a11y/alt-text
    Image: (props: ImageProps) => <Image {...props} />,
  }
}
