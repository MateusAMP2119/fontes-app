import { useEffect, useRef, useState } from 'react'
import './AgentSetup.css'

const context = `# Contexto do projeto: fontes-app

## Repositório
https://github.com/MateusAMP2119/fontes-app
Frontend Fontes para exploração de notícias e áreas de trabalho.
Stack: React 19, TypeScript, Vite, CSS, Radix UI e lucide-react.

## Orientação inicial
Leitura de AGENTS.md e README.md antes de qualquer alteração.
Verificação de git status e preservação de alterações existentes.
Este documento é um ponto de partida; os ficheiros do repositório são a referência atual.

## Estrutura
- src/main.tsx: rotas, sessão e onboarding.
- src/Dashboard.tsx e src/Dashboard.css: estrutura do dashboard, conta, projeto e temas.
- src/MakeApp.tsx: pesquisa e exploração de notícias.
- src/components/ui/: componentes partilhados.
- src/api.ts: origens públicas das APIs.
- src/auth.ts e src/projects.ts: autenticação e tipo de projeto.
- src/components/viz/shared/charts.tsx: cálculo partilhado das colunas de visualização.

## Serviços e dados
Autenticação, projetos e notícias dependem de APIs externas.
VITE_API_URL configura a API de autenticação e projetos.
VITE_NEWS_API_URL configura a API de notícias.
As visualizações do canvas incluem dados simulados.
O contexto não inclui credenciais, cookies ou dados pessoais, nem concede acesso às APIs ou ao repositório.

## Regras de implementação
Texto de produto em português de Portugal, com linguagem impessoal e ações no infinitivo.
Sem tratamento direto ao destinatário e sem o carácter U+2014.
Preservação dos temas claro e escuro e do comportamento em ecrãs pequenos.
As visualizações horizontais usam cardColumns(), com duas ou três colunas iguais, padding de 16px e gutter de 16px, conforme AGENTS.md.

## Validação
npm run build
npm run lint
Verificações de interação e layout adequadas à alteração.
O README.md contém instruções de desenvolvimento e autenticação local.
`;

export default function AgentSetup() {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(context)
      window.clearTimeout(timer.current)
      setStatus('copied')
      timer.current = window.setTimeout(() => setStatus('idle'), 2000)
    } catch {
      window.clearTimeout(timer.current)
      setStatus('error')
    }
  }

  return <div className="agent-setup">
    <button type="button" className="agent-setup-trigger" onClick={() => { void copy() }}>
      <span className="agent-setup-label">
        <span>Configurar agente</span>
        <span className="agent-setup-logos" aria-hidden="true">
          {['claude', 'openai', 'grok', 'gemini'].map(name => <span key={name}>
            <img className="agent-logo-light" src={`/agent-icons/${name}-light.svg`} width={20} height={20} alt="" />
            <img className="agent-logo-dark" src={`/agent-icons/${name}-dark.svg`} width={20} height={20} alt="" />
          </span>)}
        </span>
        
      </span>
    </button>
    <span className="agent-setup-feedback" role="status" data-visible={status === 'copied'}>{status === 'copied' ? 'Contexto de configuração copiado' : ''}</span>
    {status === 'error' && <div className="agent-setup-fallback">
      <p role="alert">Não foi possível copiar. O contexto está disponível para cópia manual.</p>
      <textarea aria-label="Contexto do fontes-app" value={context} readOnly onFocus={event => event.currentTarget.select()} />
    </div>}
  </div>
}
