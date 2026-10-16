import nextMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export for GitHub Pages (output goes to ./out)
  output: 'export',
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  images: {
    // GitHub Pages has no image optimization server
    unoptimized: true,
  },
}

const withMDX = nextMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: ['remark-gfm', 'remark-code-filename'],
    rehypePlugins: ['rehype-prism-plus'],
  },
})

export default withMDX(nextConfig)
