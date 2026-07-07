import { describe, expect, it } from 'vitest'
import { installFavicon } from './favicon'

describe('installFavicon', () => {
  it('installs the rendered Phosphor icon as an SVG data-URI favicon', () => {
    installFavicon()

    const link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')
    expect(link).not.toBeNull()
    expect(link!.type).toBe('image/svg+xml')
    expect(link!.href).toMatch(/^data:image\/svg\+xml,/)

    const markup = decodeURIComponent(link!.href.replace('data:image/svg+xml,', ''))
    expect(markup).toContain('<svg')
    expect(markup).toContain('viewBox="0 0 256 256"')
    expect(markup).toContain('fill="#7c3aed"')
  })
})
