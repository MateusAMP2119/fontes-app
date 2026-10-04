import { useLayoutEffect, useRef, type HTMLAttributes } from 'react'
import './FadingPageName.css'

export default function FadingPageName({ children, disabled = false, className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { disabled?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const paint = () => {
      node.scrollLeft = 0
      node.dataset.fadeEnd = String(!disabled && node.scrollWidth > node.clientWidth + 1)
    }
    const resize = new ResizeObserver(paint)
    resize.observe(node)
    paint()
    return () => resize.disconnect()
  }, [children, disabled])
  return <span {...props} ref={ref} className={`fading-page-name ${className}`}>
    {children}
  </span>
}
