import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { CalculatorIcon } from '@phosphor-icons/react'

const ACCENT_VIOLET = '#7c3aed'

/**
 * Installs the Phosphor calculator icon as the page favicon. The markup is
 * produced by rendering the icon component itself, so the glyph always comes
 * from @phosphor-icons/react rather than a checked-in image asset.
 */
export function installFavicon(): void {
  const mount = document.createElement('div')
  const root = createRoot(mount)
  flushSync(() => {
    root.render(createElement(CalculatorIcon, { size: 64, weight: 'fill', color: ACCENT_VIOLET }))
  })
  const iconMarkup = mount.innerHTML
  root.unmount()

  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/svg+xml'
  link.href = `data:image/svg+xml,${encodeURIComponent(iconMarkup)}`
  document.head.appendChild(link)
}
