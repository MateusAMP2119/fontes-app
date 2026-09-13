import { useCallback, useEffect, useRef, useState } from 'react'
import { API } from './api'
import Copy from './components/briefing-icons/Copy'
import ThumbMixed from './components/briefing-icons/ThumbMixed'
import { Popover } from 'radix-ui'
import Check from './components/briefing-icons/Check'
import ThumbUp from './components/briefing-icons/ThumbUp'
import ThumbDown from './components/briefing-icons/ThumbDown'
import ThumbUpFilled from './components/briefing-icons/ThumbUpFilled'
import ThumbDownFilled from './components/briefing-icons/ThumbDownFilled'

type Rating = 'up' | 'down' | null

export default function BriefingActions({ text, generationId, token }: { text: string; generationId?: string; token: string }) {
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [rating, setRating] = useState<Rating>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current?.abort(); clearTimeout(copyTimer.current) }, [])

  async function copy() {
    setError('')
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Resumo copiado.')
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch { setError('Não foi possível copiar o resumo.') }
  }

  const feedback = useCallback(async (value?: Rating) => {
    if (!generationId) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setNotice('')
    setError('')
    try {
      const response = await fetch(`${API}/api/briefing/feedback?generation_id=${encodeURIComponent(generationId)}`, {
        method: value === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}`, ...(value !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(value !== undefined ? { body: JSON.stringify({ rating: value }) } : {}),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('FEEDBACK_UNAVAILABLE')
      const data: { rating: Rating } = await response.json()
      if (!['up', 'down', null].includes(data.rating)) throw new Error('INVALID_FEEDBACK')
      if (controller.signal.aborted) return
      setRating(data.rating)
      if (value !== undefined) setNotice(value === null ? 'Avaliação removida.' : 'Avaliação guardada.')
    } catch {
      if (!controller.signal.aborted) setError(value === undefined ? 'Não foi possível consultar a avaliação.' : 'Não foi possível guardar a avaliação. Nova tentativa disponível.')
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }, [generationId, token])

  useEffect(() => { void feedback() }, [feedback])

  const FeedbackIcon = rating === 'up' ? ThumbUpFilled : rating === 'down' ? ThumbDownFilled : ThumbMixed

  return <div className="home-briefing-actions">
    <span className="sr-only" role="status">{notice}</span>
    {error && <span className="home-briefing-action-error" role="alert">{error}</span>}
    <div className="home-briefing-icons">
      <button type="button" className="home-briefing-refresh" aria-label="Copiar resumo" title={copied ? 'Copiado' : 'Copiar resumo'} onClick={() => void copy()}>
        <span key={copied ? 'copied' : 'copy'} className="home-briefing-icon-swap">{copied ? <Check className="home-briefing-icon" aria-hidden="true" /> : <Copy className="home-briefing-icon" aria-hidden="true" />}</span>
      </button>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button type="button" className="home-briefing-refresh" aria-label="Avaliação do resumo" title={rating === 'up' ? 'Útil' : rating === 'down' ? 'Não útil' : 'Avaliar resumo'} disabled={!generationId || busy}>
            <span key={rating ?? 'unrated'} className="home-briefing-icon-swap">
              <FeedbackIcon className="home-briefing-icon" aria-hidden="true" />
            </span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="home-briefing-rating" align="end" side="top" sideOffset={8} aria-label="Avaliação do resumo">
            <button type="button" className="home-briefing-refresh" disabled={busy} aria-label="Útil" title={rating === 'up' ? 'Remover avaliação' : 'Útil'} aria-pressed={rating === 'up'} onClick={() => { setOpen(false); void feedback(rating === 'up' ? null : 'up') }}>
              {rating === 'up' ? <ThumbUpFilled className="home-briefing-icon" /> : <ThumbUp className="home-briefing-icon" />}
            </button>
            <button type="button" className="home-briefing-refresh" disabled={busy} aria-label="Não útil" title={rating === 'down' ? 'Remover avaliação' : 'Não útil'} aria-pressed={rating === 'down'} onClick={() => { setOpen(false); void feedback(rating === 'down' ? null : 'down') }}>
              {rating === 'down' ? <ThumbDownFilled className="home-briefing-icon" /> : <ThumbDown className="home-briefing-icon" />}
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  </div>
}
