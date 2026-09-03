// ponytail: History-API navigation for two pages; main.tsx listens to popstate and swaps them inside a view transition
export function navigate(to: string) {
  history.pushState(null, '', to)
  dispatchEvent(new PopStateEvent('popstate'))
}
