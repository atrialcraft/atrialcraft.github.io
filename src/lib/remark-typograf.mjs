import { visit } from 'unist-util-visit'

import { typograf } from './typograf.mjs'

/** Applies `typograf` to the text of every MDX page; code stays as written */
export default function remarkTypograf() {
  return (tree) => {
    visit(tree, 'text', (node) => {
      node.value = typograf(node.value)
    })
  }
}
