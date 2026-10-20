import { Children, cloneElement, isValidElement } from 'react'

import { typograf } from '@/lib/typograf.mjs'

/**
 * `typograf` for every piece of text in React children, nested elements
 * included (links, bold…); code is left as written
 */
export function typografChildren(children: React.ReactNode): React.ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === 'string') return typograf(child)
    if (
      isValidElement<{ children?: React.ReactNode }>(child) &&
      child.type !== 'code' &&
      child.type !== 'pre' &&
      child.props.children !== undefined
    ) {
      return cloneElement(
        child,
        undefined,
        typografChildren(child.props.children),
      )
    }
    return child
  })
}
