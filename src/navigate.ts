// ponytail: History-API navigation for two pages; main.tsx listens to popstate and swaps them inside a view transition
export function navigate(to: string) {
  if (`${location.pathname}${location.search}${location.hash}` === to) return
  history.pushState(null, '', to)
  dispatchEvent(new PopStateEvent('popstate'))
}
