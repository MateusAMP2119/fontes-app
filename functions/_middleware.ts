/** Pages aliases use the canonical host so authentication keeps one cookie origin. */
export const onRequest: PagesFunction = async ({ request, next }) => {
  const url = new URL(request.url)
  if (url.hostname === 'fontes-9lo.pages.dev' || url.hostname.endsWith('.fontes-9lo.pages.dev')) {
    url.hostname = 'builder.fonteslabs.com'
    return Response.redirect(url.toString(), 307)
  }
  return next()
}
