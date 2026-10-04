/** Deliberately local and deterministic. Nothing here queries news or an AI service. */
export type MockFeed = {
  subject: string
  category: 'energy' | 'technology' | 'housing' | 'custom'
  title: string
  region: 'all' | 'portugal' | 'europe'
  period: 'week' | 'day'
  briefing: boolean
  excludeOpinion: boolean
}
export type FeedMessage = { role: 'user' | 'assistant'; text: string }
export type FeedConversation = { messages: FeedMessage[]; feed: MockFeed | null }

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export const regionLabel = (feed: MockFeed) => ({ all: 'Sem limite geográfico', portugal: 'Portugal', europe: 'Europa' })[feed.region]
export const periodLabel = (feed: MockFeed) => feed.period === 'day' ? 'Últimas 24 horas' : 'Últimos 7 dias'

export function mockFeedReply(previous: MockFeed | null, prompt: string): { feed: MockFeed; reply: string } {
  const text = normalize(prompt)
  const feed: MockFeed = previous ? { ...previous } : { subject: prompt.trim().slice(0, 100), title: prompt.trim().slice(0, 80), category: 'custom', region: 'all', period: 'week', briefing: false, excludeOpinion: false }
  const changes: string[] = []
  const title = prompt.match(/^(?:chamar|nomear|mudar (?:o )?nome para|rename to)\s+[“"']?(.+?)[”"']?$/i)?.[1]?.trim()
  if (title) return { feed: { ...feed, title: title.slice(0, 80) }, reply: `Nome alterado para «${title.slice(0, 80)}».` }
  // A handful of understandable interactions for experimenting with the UI, not an NLP claim.
  if (/energia|energetic|energy|renovave/.test(text)) {
    feed.category = 'energy'; feed.subject = 'Transição energética'; feed.title = 'Radar da energia'; changes.push('foco na transição energética')
  } else if (/tecnologia|inteligencia artificial|\bia\b|\bai\b|technology/.test(text)) {
    feed.category = 'technology'; feed.subject = 'Inteligência artificial e tecnologia'; feed.title = 'Radar da tecnologia'; changes.push('foco em inteligência artificial e tecnologia')
  } else if (/habitacao|imobiliari|housing|rendas/.test(text)) {
    feed.category = 'housing'; feed.subject = 'Habitação'; feed.title = 'Radar da habitação'; changes.push('foco no mercado da habitação')
  }
  if (/portugal|portugues/.test(text)) { feed.region = 'portugal'; changes.push('cobertura limitada a Portugal') }
  else if (/europa|europe|europeia/.test(text)) { feed.region = 'europe'; changes.push('cobertura europeia') }
  else if (/global|mundo|world|sem limite geografico/.test(text)) { feed.region = 'all'; changes.push('cobertura sem limite geográfico') }
  if (/24\s*(h|hora)|hoje|today/.test(text)) { feed.period = 'day'; changes.push('notícias das últimas 24 horas') }
  else if (/7\s*dias|semana|week/.test(text)) { feed.period = 'week'; changes.push('notícias dos últimos 7 dias') }
  if (/briefing|resumo/.test(text)) {
    feed.briefing = !/(sem|retirar|remover|tirar|remove|without)\s+(o\s+)?(briefing|resumo)/.test(text)
    changes.push(feed.briefing ? 'briefing diário adicionado' : 'briefing retirado')
  }
  if (/opiniao|opinion/.test(text)) {
    feed.excludeOpinion = !/(incluir|mostrar|include)\s+(a\s+)?(opiniao|opinion)/.test(text)
    changes.push(feed.excludeOpinion ? 'artigos de opinião excluídos' : 'artigos de opinião incluídos')
  }
  const summary = changes.join('; ')
  const reply = summary
    ? `${summary.charAt(0).toUpperCase()}${summary.slice(1)}.`
    : previous
      ? 'Ajuste não reconhecido. Exemplos: «Só Portugal», «Últimas 24 horas» ou «Adicionar briefing».'
      : `Feed de exemplo sobre «${feed.subject}».`
  return { feed, reply }
}

export function mockStories(feed: MockFeed) {
  const place = feed.region === 'portugal' ? 'em Portugal' : feed.region === 'europe' ? 'na Europa' : 'no mundo'
  const headlines: Record<MockFeed['category'], string[]> = {
    energy: [`Novos projetos renováveis aceleram a transição energética ${place}`, 'Redes elétricas no centro do debate sobre investimento', 'Comunidades de energia exploram novos modelos de produção local'],
    technology: [`Inteligência artificial abre novas frentes de investimento ${place}`, 'Regulação tecnológica coloca a transparência em primeiro plano', 'Empresas testam novos modelos de colaboração com IA'],
    housing: [`Oferta de habitação volta ao centro do debate ${place}`, 'Arrendamento: novas propostas procuram equilibrar o mercado', 'Reabilitação urbana ganha espaço nas prioridades locais'],
    custom: [`${feed.subject}: os desenvolvimentos a acompanhar ${place}`, `${feed.subject}: decisões e próximos passos em discussão`, `${feed.subject}: novas perspetivas no debate público`],
  }
  return headlines[feed.category].map((title, index) => ({
    title,
    source: ['Jornal Horizonte', 'Diário do Setor', 'Observatório Local'][index],
    time: feed.period === 'day' ? ['Há 1 h', 'Há 3 h', 'Há 6 h'][index] : ['Hoje', 'Ontem', 'Há 3 dias'][index],
    description: ['Uma visão dos principais desenvolvimentos, das decisões em curso e do que pode mudar a seguir.', 'O contexto por detrás das notícias, com diferentes perspetivas sobre o mesmo tema.', 'Os sinais locais que ajudam a compreender uma mudança mais ampla.'][index],
  }))
}

export const composerStorageKey = (userId: string) => `fontes:feed-composer:v1:${userId}`

/** Stored drafts are untrusted and deliberately do not share the real workspace schema. */
export function readFeedConversation(key: string): FeedConversation {
  const empty: FeedConversation = { messages: [], feed: null }
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    const feed = value?.feed
    if (!feed || typeof feed.subject !== 'string' || !feed.subject.trim() || feed.subject.length > 100
      || typeof feed.title !== 'string' || feed.title.length > 80
      || !['energy', 'technology', 'housing', 'custom'].includes(feed.category)
      || !['all', 'portugal', 'europe'].includes(feed.region) || !['week', 'day'].includes(feed.period)
      || typeof feed.briefing !== 'boolean' || typeof feed.excludeOpinion !== 'boolean'
      || !Array.isArray(value.messages) || !value.messages.length || value.messages.length > 100
      || !value.messages.every((message: FeedMessage) => message && ['user', 'assistant'].includes(message.role) && typeof message.text === 'string' && message.text.length <= 2000)) return empty
    return { feed, messages: value.messages }
  } catch { return empty }
}
