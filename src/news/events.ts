/**
 * News events — the things a board can be built about.
 *
 * Every entry is hand-written from real coverage of early August 2026
 * (Iberian and world news); headlines paraphrase what the named outlets
 * reported. Counts, heat and every derived series are mock. Ids are stable
 * slugs and seed every generated series (see ./series), so renaming one
 * silently reshuffles that event's charts.
 */

export type EventCategory =
  | 'World'
  | 'Business'
  | 'Tech'
  | 'Science'
  | 'Climate'
  | 'Sport'
  | 'Culture'

export type Region =
  | 'Global'
  | 'Europe'
  | 'Americas'
  | 'Asia'
  | 'Africa'
  | 'Middle East'

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed'

export type Headline = {
  title: string
  source: string
  /** ISO calendar date, YYYY-MM-DD. */
  date: string
}

export type NewsEvent = {
  /** Stable slug. Seeds every generated series for this event. */
  id: string
  title: string
  /** One sentence — suggestion subtitle and the header widget's body. */
  summary: string
  category: EventCategory
  region: Region
  /** ISO date the story broke; anchors the generated time series. */
  startedAt: string
  /** Days of coverage the series spans. */
  windowDays: number
  articleCount: number
  sourceCount: number
  sentiment: Sentiment
  /** 0–100. Sole input to the trending order. */
  heat: number
  /** Outlets. Drives the top-outlets bars and headline attributions. */
  sources: string[]
  /** The only real prose in the dashboard. */
  headlines: Headline[]
  /** Sub-threads of the story. Drives the donut. */
  angles: string[]
  /** Actors in the story, most central first. Drives the entities widget. */
  entities: string[]
  /** Extra search tokens beyond title and summary. */
  keywords: string[]
}

export const EVENT_CATEGORIES: EventCategory[] = [
  'World',
  'Business',
  'Tech',
  'Science',
  'Climate',
  'Sport',
  'Culture',
]

/** Portuguese display labels; the union values stay as data keys. */
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  World: 'Mundo',
  Business: 'Economia',
  Tech: 'Tecnologia',
  Science: 'Ciência',
  Climate: 'Clima',
  Sport: 'Desporto',
  Culture: 'Cultura',
}

export const REGION_LABELS: Record<Region, string> = {
  Global: 'Global',
  Europe: 'Europa',
  Americas: 'Américas',
  Asia: 'Ásia',
  Africa: 'África',
  'Middle East': 'Médio Oriente',
}

export const NEWS_EVENTS: NewsEvent[] = [
  {
    id: 'eclipse-total-iberia',
    title: 'Eclipse solar total atravessa a Península Ibérica',
    summary:
      'A 12 de agosto, o primeiro eclipse total em mais de um século visível em Espanha e num ponto de Portugal continental esgota hotéis e mobiliza uma semana de ciência.',
    category: 'Science',
    region: 'Europe',
    startedAt: '2026-08-03',
    windowDays: 7,
    articleCount: 3240,
    sourceCount: 187,
    sentiment: 'positive',
    heat: 96,
    sources: ['Público', 'El País', 'RTP Notícias', 'SIC Notícias', 'La Vanguardia', 'Observador'],
    headlines: [
      { title: 'Primeiro eclipse solar total em Espanha em mais de cem anos chega a 12 de agosto', source: 'El País', date: '2026-08-03' },
      { title: 'Hotéis praticamente esgotados na única localidade portuguesa com totalidade', source: 'Público', date: '2026-08-04' },
      { title: 'Galiza, Astúrias e Saragoça preparam-se para milhões de observadores', source: 'La Vanguardia', date: '2026-08-05' },
      { title: 'Autoridades alertam para óculos certificados e observação segura', source: 'RTP Notícias', date: '2026-08-06' },
      { title: 'Uma semana de atividades dedicadas à ciência e à astronomia no interior', source: 'Observador', date: '2026-08-07' },
    ],
    angles: ['Observação e segurança', 'Turismo astronómico', 'Ciência e investigação', 'Logística e trânsito'],
    entities: ['Comunidade científica', 'Proteção Civil', 'Autarquias locais', 'Operadores turísticos', 'Observatório Astronómico de Lisboa', 'IPMA'],
    keywords: ['eclipse', 'astronomia', 'sol', 'totalidade', '12 de agosto'],
  },
  {
    id: 'ceuta-crise-migratoria',
    title: 'Crise migratória em Ceuta agrava-se',
    summary:
      'O número de mortos na tragédia da fronteira subiu para 141, com a UE em reunião de emergência e Madrid e Rabat em braço de ferro diplomático.',
    category: 'World',
    region: 'Europe',
    startedAt: '2026-07-26',
    windowDays: 15,
    articleCount: 4180,
    sourceCount: 226,
    sentiment: 'negative',
    heat: 94,
    sources: ['El País', 'Al Jazeera', 'Euronews', 'Lusa', 'Le Monde', 'RTP Notícias'],
    headlines: [
      { title: 'Rumores nas redes sociais alimentaram a corrida à fronteira de Ceuta', source: 'El País', date: '2026-07-28' },
      { title: 'UE convoca reunião de emergência sobre a pressão migratória em Espanha', source: 'Euronews', date: '2026-08-02' },
      { title: 'Número de mortos sobe para 141 após recuperação de 63 corpos em águas marroquinas', source: 'Al Jazeera', date: '2026-08-04' },
      { title: 'Menores não acompanhados em Ceuta sem abrigo nem alimentação suficiente', source: 'Lusa', date: '2026-08-05' },
      { title: 'Enclaves no centro de um braço de ferro diplomático entre Madrid e Rabat', source: 'Le Monde', date: '2026-08-06' },
    ],
    angles: ['Resgate e vítimas', 'Resposta europeia', 'Tensão diplomática', 'Menores não acompanhados'],
    entities: ['Governo espanhol', 'Comissão Europeia', 'Guardia Civil', 'ACNUR', 'ONG de resgate', 'Governo marroquino'],
    keywords: ['ceuta', 'migração', 'fronteira', 'marrocos', 'espanha'],
  },
  {
    id: 'ataques-kyiv',
    title: 'Ataques russos matam 15 pessoas em Kyiv',
    summary:
      'Uma vaga noturna de mísseis e drones matou pelo menos 15 pessoas e feriu 42 na capital ucraniana e arredores, com incêndios em armazéns combatidos até de manhã.',
    category: 'World',
    region: 'Europe',
    startedAt: '2026-08-05',
    windowDays: 5,
    articleCount: 2620,
    sourceCount: 168,
    sentiment: 'negative',
    heat: 92,
    sources: ['Reuters', 'Euronews', 'BBC', 'Público', 'Al Jazeera'],
    headlines: [
      { title: 'Mísseis e drones russos matam pelo menos 15 pessoas na região de Kyiv', source: 'Reuters', date: '2026-08-05' },
      { title: 'Bombeiros combatem incêndios em armazéns e edifícios durante toda a noite', source: 'Euronews', date: '2026-08-05' },
      { title: 'Balanço sobe para 42 feridos; buscas continuam nos escombros', source: 'BBC', date: '2026-08-06' },
      { title: 'Kyiv pede aos aliados reforço urgente das defesas antiaéreas', source: 'Público', date: '2026-08-07' },
    ],
    angles: ['Vítimas e resgate', 'Defesa antiaérea', 'Resposta internacional', 'Infraestrutura atingida'],
    entities: ['Governo ucraniano', 'Serviços de emergência', 'Administração de Kyiv', 'Exército russo', 'Aliados da NATO'],
    keywords: ['ucrânia', 'kyiv', 'guerra', 'ataques', 'rússia'],
  },
  {
    id: 'onda-calor-iberia',
    title: 'Cúpula de calor volta a instalar-se sobre a Península',
    summary:
      'A quarta vaga de calor do verão, presa por um bloqueio em ómega, empurra os termómetros para os 45 graus e coloca o interior em risco máximo de incêndio.',
    category: 'Climate',
    region: 'Europe',
    startedAt: '2026-07-24',
    windowDays: 17,
    articleCount: 2860,
    sourceCount: 174,
    sentiment: 'negative',
    heat: 90,
    sources: ['Público', 'El Mundo', 'Expresso', 'Euronews', 'SIC Notícias'],
    headlines: [
      { title: 'Quarta vaga de calor do verão empurra termómetros para os 45 graus', source: 'El Mundo', date: '2026-07-27' },
      { title: 'Bloqueio em ómega prende cúpula de calor sobre a Península e França', source: 'Euronews', date: '2026-07-29' },
      { title: 'Concelhos do interior em risco máximo de incêndio rural', source: 'Público', date: '2026-08-02' },
      { title: 'Junho foi o mais quente de sempre na Europa ocidental', source: 'Expresso', date: '2026-08-04' },
    ],
    angles: ['Temperaturas recorde', 'Risco de incêndio', 'Saúde pública', 'Energia e consumo'],
    entities: ['IPMA', 'Proteção Civil', 'AEMET', 'Serviço Nacional de Saúde', 'Bombeiros', 'REN'],
    keywords: ['calor', 'vaga de calor', 'incêndios', 'seca', 'recordes'],
  },
  {
    id: 'gaza-corpos-recuperados',
    title: 'Gaza recupera 112 corpos de ataque de 2023',
    summary:
      'Equipas de resgate recuperaram 112 corpos no local de um ataque aéreo de 2023, num funeral coletivo que juntou centenas de famílias; muitas vítimas continuam sob os escombros.',
    category: 'World',
    region: 'Middle East',
    startedAt: '2026-08-02',
    windowDays: 8,
    articleCount: 1890,
    sourceCount: 132,
    sentiment: 'negative',
    heat: 86,
    sources: ['Al Jazeera', 'Reuters', 'Lusa', 'Euronews', 'Público'],
    headlines: [
      { title: 'Equipas recuperam 112 corpos no local de ataque aéreo de 2023', source: 'Al Jazeera', date: '2026-08-02' },
      { title: 'Funeral coletivo em Gaza junta centenas de famílias enlutadas', source: 'Reuters', date: '2026-08-04' },
      { title: 'Muitas vítimas continuam por identificar sob os escombros', source: 'Lusa', date: '2026-08-06' },
    ],
    angles: ['Recuperação e identificação', 'Luto das famílias', 'Contexto humanitário'],
    entities: ['Equipas de resgate', 'Famílias das vítimas', 'Autoridades de Gaza', 'Organizações humanitárias', 'Cruz Vermelha'],
    keywords: ['gaza', 'corpos', 'escombros', 'funeral', 'humanitário'],
  },
  {
    id: 'privatizacao-tap',
    title: 'Privatização da TAP entra na fase final',
    summary:
      'Air France-KLM e Lufthansa foram convidadas a apresentar propostas vinculativas pela posição de até 49,9%, com o Governo a garantir marca e empregos em Portugal.',
    category: 'Business',
    region: 'Europe',
    startedAt: '2026-07-18',
    windowDays: 22,
    articleCount: 2140,
    sourceCount: 118,
    sentiment: 'mixed',
    heat: 85,
    sources: ['ECO', 'Jornal Económico', 'Dinheiro Vivo', 'Observador', 'Reuters'],
    headlines: [
      { title: 'Air France-KLM e Lufthansa convidadas a apresentar propostas vinculativas', source: 'ECO', date: '2026-07-18' },
      { title: 'Pinto Luz garante que TAP mantém marca e empregos em Portugal', source: 'Dinheiro Vivo', date: '2026-07-22' },
      { title: 'Comissão especial de acompanhamento segue cada etapa do processo', source: 'Jornal Económico', date: '2026-07-28' },
      { title: 'Bruxelas atenta ao desenho da venda de até 49,9% do capital', source: 'Reuters', date: '2026-08-03' },
    ],
    angles: ['Propostas vinculativas', 'Emprego e marca', 'Escrutínio político', 'Consolidação europeia'],
    entities: ['TAP', 'Governo português', 'Air France-KLM', 'Lufthansa', 'Comissão de Acompanhamento', 'Sindicatos da aviação'],
    keywords: ['tap', 'privatização', 'aviação', 'lufthansa', 'air france'],
  },
  {
    id: 'ai-act-transparencia',
    title: 'Regras de transparência do AI Act em vigor',
    summary:
      'Desde 2 de agosto, interações com IA, deepfakes e conteúdo sintético têm de ser claramente identificados em toda a União Europeia.',
    category: 'Tech',
    region: 'Europe',
    startedAt: '2026-08-02',
    windowDays: 8,
    articleCount: 1980,
    sourceCount: 142,
    sentiment: 'mixed',
    heat: 83,
    sources: ['Euronews', 'ECO', 'Expresso', 'Politico', 'Observador'],
    headlines: [
      { title: 'Rotulagem obrigatória de deepfakes e conteúdo sintético já está em vigor', source: 'Euronews', date: '2026-08-02' },
      { title: 'Empresas correm para adaptar chatbots às novas regras de transparência', source: 'ECO', date: '2026-08-03' },
      { title: 'Startups europeias queixam-se do custo de conformidade', source: 'Politico', date: '2026-08-05' },
      { title: 'Reguladores nacionais publicam primeiras orientações de aplicação', source: 'Expresso', date: '2026-08-07' },
    ],
    angles: ['Rotulagem de conteúdos', 'Custo de conformidade', 'Fiscalização', 'Reação da indústria'],
    entities: ['Comissão Europeia', 'Fornecedores de modelos', 'Startups europeias', 'Reguladores nacionais', 'Grupos da indústria'],
    keywords: ['ai act', 'inteligência artificial', 'deepfakes', 'transparência', 'regulação'],
  },
  {
    id: 'mercado-liga-recorde',
    title: 'I Liga bate recorde de investimento no mercado',
    summary:
      'Os clubes do principal campeonato ultrapassaram os 362 milhões de euros em reforços, com o FC Porto a fechar o maior mercado da sua história.',
    category: 'Sport',
    region: 'Europe',
    startedAt: '2026-07-12',
    windowDays: 28,
    articleCount: 1740,
    sourceCount: 84,
    sentiment: 'mixed',
    heat: 80,
    sources: ['Record', 'A Bola', 'O Jogo', 'Maisfutebol', 'RTP Notícias'],
    headlines: [
      { title: 'I Liga ultrapassa os 362 milhões e bate recorde de investimento', source: 'Record', date: '2026-07-14' },
      { title: 'FC Porto fecha o maior mercado de sempre: dez reforços por 94 milhões', source: 'O Jogo', date: '2026-07-20' },
      { title: 'Braga gasta como nunca e agita a luta pelo título', source: 'A Bola', date: '2026-07-26' },
      { title: 'Sporting comedido falha inscrição de reforço no fecho do mercado', source: 'Maisfutebol', date: '2026-08-02' },
    ],
    angles: ['Recorde de gastos', 'Reforços dos grandes', 'Sustentabilidade financeira', 'Arranque da época'],
    entities: ['FC Porto', 'SL Benfica', 'Sporting CP', 'SC Braga', 'Liga Portugal', 'Empresários de jogadores'],
    keywords: ['futebol', 'mercado', 'transferências', 'liga', 'reforços'],
  },
  {
    id: 'oe2026-habitacao',
    title: 'Habitação domina o debate do OE2026',
    summary:
      'O Governo lista Porta 65 alargado, isenção de IMT na primeira casa e garantia pública no crédito jovem, e admite devolver 300 mil casas devolutas ao mercado.',
    category: 'Business',
    region: 'Europe',
    startedAt: '2026-07-30',
    windowDays: 11,
    articleCount: 1650,
    sourceCount: 96,
    sentiment: 'mixed',
    heat: 77,
    sources: ['Dinheiro Vivo', 'Público', 'ECO', 'Jornal de Notícias', 'Expresso'],
    headlines: [
      { title: 'Porta 65 alargado e isenção de IMT para a primeira casa entre as medidas', source: 'Dinheiro Vivo', date: '2026-07-31' },
      { title: '300 mil casas devolutas podem voltar ao mercado, diz ministro', source: 'Público', date: '2026-08-02' },
      { title: 'Garantia pública no crédito jovem arranca com bancos divididos', source: 'ECO', date: '2026-08-04' },
      { title: 'Autarquias querem parcerias para reabilitar património do Estado', source: 'Jornal de Notícias', date: '2026-08-06' },
    ],
    angles: ['Medidas fiscais', 'Casas devolutas', 'Crédito jovem', 'Reação política'],
    entities: ['Governo português', 'Ministério das Infraestruturas', 'Bancos', 'Autarquias', 'Associações de inquilinos', 'Promotores imobiliários'],
    keywords: ['habitação', 'oe2026', 'imt', 'porta 65', 'rendas'],
  },
  {
    id: 'sudao-darfur-ataques',
    title: 'Ataques de drones matam 37 no Darfur do Norte',
    summary:
      'Um ataque na zona de Ghurra Zawia, em Kabkabiya, matou pelo menos 37 pessoas, com a ONU a alertar para o bloqueio do acesso humanitário.',
    category: 'World',
    region: 'Africa',
    startedAt: '2026-08-02',
    windowDays: 8,
    articleCount: 1240,
    sourceCount: 84,
    sentiment: 'negative',
    heat: 75,
    sources: ['Al Jazeera', 'Reuters', 'Lusa', 'Euronews', 'RFI'],
    headlines: [
      { title: 'Ataque de drone em Kabkabiya mata pelo menos 37 pessoas', source: 'Al Jazeera', date: '2026-08-03' },
      { title: 'ONU manifesta profunda preocupação com ataques no Darfur do Norte', source: 'Reuters', date: '2026-08-04' },
      { title: 'Acesso humanitário continua bloqueado nas zonas mais atingidas', source: 'RFI', date: '2026-08-06' },
    ],
    angles: ['Vítimas civis', 'Resposta da ONU', 'Acesso humanitário'],
    entities: ['OCHA', 'Forças em conflito', 'Organizações humanitárias', 'Comunidades locais', 'União Africana'],
    keywords: ['sudão', 'darfur', 'drones', 'conflito', 'onu'],
  },
  {
    id: 'brasil-ciclone-alerta',
    title: 'Ciclone-bomba põe Rio Grande do Sul em alerta',
    summary:
      'O Brasil emitiu alerta vermelho para o Sul com a aproximação de um ciclone-bomba, com municípios a abrir abrigos e a suspender aulas por precaução.',
    category: 'Climate',
    region: 'Americas',
    startedAt: '2026-08-04',
    windowDays: 6,
    articleCount: 1360,
    sourceCount: 92,
    sentiment: 'negative',
    heat: 74,
    sources: ['G1', 'Folha de S.Paulo', 'Reuters', 'Euronews'],
    headlines: [
      { title: 'Defesa Civil emite alerta vermelho para o Rio Grande do Sul', source: 'G1', date: '2026-08-04' },
      { title: 'Ciclone-bomba avança sobre o Sul do Brasil com ventos fortes', source: 'Folha de S.Paulo', date: '2026-08-05' },
      { title: 'Municípios abrem abrigos e suspendem aulas por precaução', source: 'Reuters', date: '2026-08-06' },
    ],
    angles: ['Alerta e prevenção', 'Impacto no terreno', 'Resposta das autoridades'],
    entities: ['Defesa Civil', 'Governo do Rio Grande do Sul', 'INMET', 'Municípios afetados', 'Concessionárias de energia'],
    keywords: ['brasil', 'ciclone', 'alerta', 'tempestade', 'rio grande do sul'],
  },
  {
    id: 'el-nino-fome',
    title: 'El Niño pode empurrar 49 milhões para fome aguda',
    summary:
      'O Programa Alimentar Mundial alerta que o fortalecimento do El Niño pode agravar a fome aguda para mais 49 milhões de pessoas até ao final de 2027.',
    category: 'Climate',
    region: 'Global',
    startedAt: '2026-07-29',
    windowDays: 12,
    articleCount: 1050,
    sourceCount: 78,
    sentiment: 'negative',
    heat: 71,
    sources: ['Reuters', 'Al Jazeera', 'Euronews', 'Lusa', 'The Guardian'],
    headlines: [
      { title: 'PAM alerta: El Niño pode agravar fome aguda para mais 49 milhões', source: 'Reuters', date: '2026-07-30' },
      { title: 'Seca prolongada e calor extremo pressionam colheitas em três continentes', source: 'The Guardian', date: '2026-08-02' },
      { title: 'Agências pedem financiamento antecipado para evitar crise em 2027', source: 'Lusa', date: '2026-08-05' },
    ],
    angles: ['Alerta do PAM', 'Impacto nas colheitas', 'Financiamento humanitário'],
    entities: ['Programa Alimentar Mundial', 'Nações Unidas', 'Governos afetados', 'ONG humanitárias', 'Doadores internacionais'],
    keywords: ['el niño', 'fome', 'clima', 'pam', 'colheitas'],
  },
  {
    id: 'japao-rearmamento',
    title: 'Japão acelera afastamento do pacifismo',
    summary:
      'Tóquio instala lançadores de mísseis nas ilhas exteriores, aumenta a despesa militar e amplia pactos de defesa, numa viragem observada com atenção pelos vizinhos.',
    category: 'World',
    region: 'Asia',
    startedAt: '2026-07-20',
    windowDays: 20,
    articleCount: 1120,
    sourceCount: 88,
    sentiment: 'mixed',
    heat: 66,
    sources: ['Nikkei Asia', 'Reuters', 'Euronews', 'BBC'],
    headlines: [
      { title: 'Japão instala lançadores de mísseis nas ilhas exteriores', source: 'Nikkei Asia', date: '2026-07-22' },
      { title: 'Despesa militar volta a subir e amplia pactos de defesa', source: 'Reuters', date: '2026-07-28' },
      { title: 'Vizinhos observam com atenção a viragem estratégica de Tóquio', source: 'Euronews', date: '2026-08-03' },
    ],
    angles: ['Despesa militar', 'Pactos de defesa', 'Reação regional'],
    entities: ['Governo japonês', 'Forças de Autodefesa', 'Estados Unidos', 'Governo chinês', 'Coreia do Sul'],
    keywords: ['japão', 'defesa', 'mísseis', 'pacifismo', 'ásia'],
  },
  {
    id: 'colombia-posse-cali',
    title: 'Colômbia investe presidente fora de Bogotá',
    summary:
      'Cali recebeu a 7 de agosto a primeira tomada de posse presidencial realizada fora da capital em mais de um século, na Arena USC.',
    category: 'World',
    region: 'Americas',
    startedAt: '2026-08-05',
    windowDays: 5,
    articleCount: 980,
    sourceCount: 76,
    sentiment: 'neutral',
    heat: 64,
    sources: ['El País', 'Reuters', 'France 24', 'Al Jazeera'],
    headlines: [
      { title: 'Cali recebe a primeira tomada de posse fora de Bogotá em mais de um século', source: 'El País', date: '2026-08-05' },
      { title: 'Novo presidente promete segurança e reconciliação no discurso inaugural', source: 'France 24', date: '2026-08-07' },
      { title: 'Delegações regionais avaliam o novo mapa político sul-americano', source: 'Reuters', date: '2026-08-08' },
    ],
    angles: ['Tomada de posse', 'Agenda de segurança', 'Relações regionais'],
    entities: ['Presidência da Colômbia', 'Congresso colombiano', 'Delegações estrangeiras', 'Autoridades de Cali'],
    keywords: ['colômbia', 'posse', 'cali', 'presidente', 'américa latina'],
  },
  {
    id: 'festivais-agosto',
    title: 'Agosto de festivais enche o interior',
    summary:
      'Com 215 festivais marcados para agosto, Paredes de Coura confirma Underworld e CMAT e o Neopop celebra 20 anos em Viana do Castelo.',
    category: 'Culture',
    region: 'Europe',
    startedAt: '2026-08-01',
    windowDays: 9,
    articleCount: 640,
    sourceCount: 52,
    sentiment: 'positive',
    heat: 63,
    sources: ['Blitz', 'Público', 'NiT', 'Jornal de Notícias', 'Observador'],
    headlines: [
      { title: 'Paredes de Coura confirma Underworld e CMAT no cartaz do "couraíso"', source: 'Blitz', date: '2026-08-01' },
      { title: 'Neopop celebra 20 anos com edição alargada em Viana do Castelo', source: 'Público', date: '2026-08-03' },
      { title: '215 festivais em agosto: o mapa da música que enche o país', source: 'NiT', date: '2026-08-05' },
      { title: 'Alojamento esgotado nas vilas que recebem os grandes cartazes', source: 'Jornal de Notícias', date: '2026-08-07' },
    ],
    angles: ['Cartazes e estreias', 'Impacto no território', 'Turismo musical'],
    entities: ['Organizadores de festivais', 'Autarquias locais', 'Artistas', 'Turismo de Portugal', 'Comerciantes locais'],
    keywords: ['festivais', 'música', 'verão', 'paredes de coura', 'neopop'],
  },
  {
    id: 'cibercrime-ia-africa',
    title: 'Cibercrime com IA dispara em África',
    summary:
      'Mais de metade dos incidentes reportados já envolve ferramentas de IA, com perdas a mais do que duplicar desde 2024 para 484 milhões de dólares.',
    category: 'Tech',
    region: 'Africa',
    startedAt: '2026-07-27',
    windowDays: 14,
    articleCount: 890,
    sourceCount: 64,
    sentiment: 'negative',
    heat: 61,
    sources: ['Reuters', 'Euronews', 'RFI', 'Lusa'],
    headlines: [
      { title: 'Perdas com cibercrime mais do que duplicam para 484 milhões de dólares', source: 'Reuters', date: '2026-07-29' },
      { title: 'Mais de metade dos incidentes já envolve ferramentas de IA', source: 'Euronews', date: '2026-08-01' },
      { title: 'Identidades sintéticas contornam sistemas biométricos de segurança', source: 'RFI', date: '2026-08-04' },
    ],
    angles: ['Fraude com IA', 'Perdas financeiras', 'Resposta dos reguladores'],
    entities: ['Interpol', 'Bancos centrais africanos', 'Empresas de cibersegurança', 'Operadores de telecomunicações', 'União Africana'],
    keywords: ['cibercrime', 'ia', 'áfrica', 'fraude', 'biometria'],
  },
]

export function findEvent(id: string): NewsEvent | undefined {
  return NEWS_EVENTS.find((e) => e.id === id)
}

/** The pre-typing list: hottest first. */
export function topByHeat(pool: NewsEvent[], count = 6): NewsEvent[] {
  return [...pool].sort((a, b) => b.heat - a.heat).slice(0, count)
}

/**
 * Ranked match within `pool`. An empty query falls back to the hottest of the
 * pool, so callers render one list whether or not the user has typed.
 */
export function searchEvents(query: string, pool: NewsEvent[] = NEWS_EVENTS): NewsEvent[] {
  const q = query.trim().toLowerCase()
  if (!q) return topByHeat(pool)
  return pool
    .map((e) => ({ e, s: score(e, q) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || b.e.heat - a.e.heat)
    .map((r) => r.e)
}

/** Title matches outrank metadata, which outranks body text. */
function score(e: NewsEvent, q: string): number {
  const title = e.title.toLowerCase()
  if (title.startsWith(q)) return 100
  if (title.includes(q)) return 70
  if (e.keywords.some((k) => k.includes(q))) return 50
  if (
    e.category.toLowerCase().includes(q) ||
    CATEGORY_LABELS[e.category].toLowerCase().includes(q) ||
    e.region.toLowerCase().includes(q) ||
    REGION_LABELS[e.region].toLowerCase().includes(q)
  )
    return 35
  if (e.summary.toLowerCase().includes(q)) return 20
  if (e.headlines.some((h) => h.title.toLowerCase().includes(q))) return 10
  return 0
}
