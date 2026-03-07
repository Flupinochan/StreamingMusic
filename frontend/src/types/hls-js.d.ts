declare module 'hls.js/dist/hls.light' {
  import Hls from 'hls.js'
  const defaultExport: typeof Hls
  export default defaultExport
  export const Events: typeof Hls.Events
}
