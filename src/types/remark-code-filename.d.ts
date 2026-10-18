// Local remark plugin (plugins/remark-code-filename), written in plain JS
declare module 'remark-code-filename' {
  const remarkCodeFilename: () => (tree: unknown) => void
  export default remarkCodeFilename
}
