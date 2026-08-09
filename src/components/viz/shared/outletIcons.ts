/**
 * Real outlet favicons, bundled at build time. Keyed by the outlet's display
 * name via an accent-stripping slug, so data files keep plain names.
 */

const FILES = import.meta.glob('../../../assets/outlets/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function outletIcon(name: string): string | undefined {
  return FILES[`../../../assets/outlets/${slug(name)}.png`]
}
