import { useEffect, useState } from 'react'

type Code = { name: string; slug: string; code: string; expiresAt: number }

export default function OrganizationAccessCode() {
  const [code, setCode] = useState<Code | null>(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    setCode(null)
    setError('')
    fetch('/api/auth/organization-access/code', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 403) return // Only owners/admins can see or share codes.
        if (!response.ok) throw new Error()
        const result = await response.json() as Code
        if (controller.signal.aborted) return
        setCode(result)
        timer = setTimeout(() => setVersion((value) => value + 1), Math.max(0, result.expiresAt - Date.now()))
      })
      .catch(() => { if (!controller.signal.aborted) setError('Não foi possível carregar o código.') })
    return () => { controller.abort(); clearTimeout(timer) }
  }, [version])
  if (error) return <div className="make-account-email"><p role="alert">{error}</p><button type="button" onClick={() => setVersion((value) => value + 1)}>Tentar novamente</button></div>
  if (!code) return null
  return <div className="make-account-email">
    <strong>{code.name}</strong><br />
    Identificador: <span>{code.slug}</span><br />
    Código de entrada: <strong>{code.code}</strong><br />
    <span>Válido até {new Date(code.expiresAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}. Partilha apenas com quem queres convidar.</span>
  </div>
}
