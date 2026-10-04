import { transitionView } from './viewTransition'

// Commit the URL and the screen together. A later navigation must not be
// overwritten by an earlier inspector/sidebar update still awaiting its swap.
export function navigate(to: string) {
  transitionView(() => {
    if (`${location.pathname}${location.search}${location.hash}` === to) return
    history.pushState(null, '', to)
    dispatchEvent(new PopStateEvent('popstate'))
  })
}
