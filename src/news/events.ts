/**
 * Mock news events — the things a board can be built about.
 *
 * Every entry is hand-written. Ids are stable slugs and seed every generated
 * series (see ./series), so renaming one silently reshuffles that event's
 * charts. Outlets are invented on purpose: attaching fabricated headlines to
 * real newsrooms would make the mock read as real.
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

export const NEWS_EVENTS: NewsEvent[] = [
  {
    id: 'kestrel-harbour-bridge',
    title: 'Kestrel Harbour bridge collapse',
    summary:
      'A forty-year-old span dropped into the estuary during the morning commute; a public inquiry opened within the week.',
    category: 'World',
    region: 'Europe',
    startedAt: '2026-06-11',
    windowDays: 21,
    articleCount: 4820,
    sourceCount: 214,
    sentiment: 'negative',
    heat: 94,
    sources: ['Northwire', 'The Ledger', 'Meridian Post', 'Cable 9', 'Estuary Daily', 'Civic Review'],
    headlines: [
      { title: 'Kestrel Harbour bridge gives way during the morning commute', source: 'Northwire', date: '2026-06-11' },
      { title: 'Inspectors flagged the eastern span twice since 2023, records show', source: 'The Ledger', date: '2026-06-13' },
      { title: 'Transport minister resists calls to pause the regional roads budget', source: 'Meridian Post', date: '2026-06-16' },
      { title: 'Estuary traffic rerouted through Alder Crossing until at least spring', source: 'Estuary Daily', date: '2026-06-19' },
      { title: 'Inquiry chair names three engineering firms in opening statement', source: 'Civic Review', date: '2026-06-24' },
    ],
    angles: ['Rescue operation', 'Inspection records', 'Transport funding', 'Legal liability'],
    keywords: ['bridge', 'infrastructure', 'collapse', 'inquiry', 'estuary'],
  },
  {
    id: 'atlas-chip-merger',
    title: 'Atlas Silicon buys Verano Foundry',
    summary:
      'A $41bn all-stock deal that would fold the last independent European foundry into a US chipmaker.',
    category: 'Business',
    region: 'Global',
    startedAt: '2026-05-02',
    windowDays: 28,
    articleCount: 3110,
    sourceCount: 168,
    sentiment: 'mixed',
    heat: 88,
    sources: ['The Ledger', 'Quorum Business', 'Northwire', 'Signal & Trade', 'Bench Report'],
    headlines: [
      { title: 'Atlas Silicon agrees $41bn all-stock takeover of Verano Foundry', source: 'The Ledger', date: '2026-05-02' },
      { title: 'Brussels signals a Phase II review before the summer recess', source: 'Quorum Business', date: '2026-05-07' },
      { title: 'Verano staff told the Dresden fab is "not on the table"', source: 'Bench Report', date: '2026-05-12' },
      { title: 'Three rival bidders walked away over the debt covenant, sources say', source: 'Signal & Trade', date: '2026-05-21' },
    ],
    angles: ['Antitrust review', 'Fab investment', 'Shareholder response', 'Supply chain'],
    keywords: ['chips', 'semiconductor', 'merger', 'antitrust', 'foundry'],
  },
  {
    id: 'thaw-line-2026',
    title: 'Northern thaw line moves 300km',
    summary:
      'Survey data put continuous permafrost 300km further north than the 2011 baseline, resetting infrastructure planning.',
    category: 'Climate',
    region: 'Global',
    startedAt: '2026-07-14',
    windowDays: 14,
    articleCount: 1470,
    sourceCount: 96,
    sentiment: 'negative',
    heat: 81,
    sources: ['Meridian Post', 'Terrain Journal', 'Northwire', 'The Ledger'],
    headlines: [
      { title: 'Permafrost survey redraws the northern thaw line by 300km', source: 'Terrain Journal', date: '2026-07-14' },
      { title: 'Pipeline operators asked to resubmit ground-stability filings', source: 'Northwire', date: '2026-07-17' },
      { title: 'Four settlements face relocation studies within the decade', source: 'Meridian Post', date: '2026-07-22' },
    ],
    angles: ['Survey methodology', 'Infrastructure risk', 'Relocation planning'],
    keywords: ['permafrost', 'thaw', 'climate', 'arctic', 'survey'],
  },
  {
    id: 'harrow-vaccine-trial',
    title: 'Harrow malaria vaccine clears phase III',
    summary:
      'A single-dose candidate reported 79% efficacy across four trial sites, with rollout talks starting immediately.',
    category: 'Science',
    region: 'Africa',
    startedAt: '2026-06-28',
    windowDays: 18,
    articleCount: 2240,
    sourceCount: 141,
    sentiment: 'positive',
    heat: 86,
    sources: ['Lancet Wire', 'Meridian Post', 'Northwire', 'Continental Health', 'The Ledger'],
    headlines: [
      { title: 'Single-dose malaria candidate reports 79% efficacy in phase III', source: 'Lancet Wire', date: '2026-06-28' },
      { title: 'Four trial sites, 31,000 participants: how Harrow was run', source: 'Continental Health', date: '2026-07-01' },
      { title: 'Manufacturing deal would put first doses in clinics by March', source: 'The Ledger', date: '2026-07-06' },
      { title: 'Regulators ask for six more months of follow-up data', source: 'Meridian Post', date: '2026-07-11' },
    ],
    angles: ['Trial results', 'Manufacturing', 'Regulatory path', 'Funding'],
    keywords: ['malaria', 'vaccine', 'trial', 'health', 'efficacy'],
  },
  {
    id: 'baltic-cable-cut',
    title: 'Baltic data cable severed',
    summary:
      'Two subsea cables went dark within nine hours, cutting a third of regional transit capacity.',
    category: 'World',
    region: 'Europe',
    startedAt: '2026-07-22',
    windowDays: 12,
    articleCount: 1980,
    sourceCount: 127,
    sentiment: 'negative',
    heat: 91,
    sources: ['Northwire', 'Signal & Trade', 'The Ledger', 'Cable 9', 'Harbour Watch'],
    headlines: [
      { title: 'Two Baltic subsea cables go dark within nine hours', source: 'Northwire', date: '2026-07-22' },
      { title: 'Transit capacity down a third; operators reroute via the south', source: 'Signal & Trade', date: '2026-07-23' },
      { title: 'Survey vessel reaches the first break site in heavy weather', source: 'Harbour Watch', date: '2026-07-26' },
      { title: 'Repair window slips to September, operators concede', source: 'The Ledger', date: '2026-07-31' },
    ],
    angles: ['Repair effort', 'Capacity impact', 'Investigation', 'Redundancy plans'],
    keywords: ['cable', 'subsea', 'baltic', 'outage', 'infrastructure'],
  },
  {
    id: 'meridian-ai-act',
    title: 'Meridian AI Act comes into force',
    summary:
      'Compliance deadlines began landing for model providers, with the first registry filings due in ninety days.',
    category: 'Tech',
    region: 'Europe',
    startedAt: '2026-07-01',
    windowDays: 24,
    articleCount: 2670,
    sourceCount: 158,
    sentiment: 'mixed',
    heat: 84,
    sources: ['Quorum Business', 'Bench Report', 'The Ledger', 'Northwire', 'Signal & Trade'],
    headlines: [
      { title: 'Meridian AI Act takes effect; first registry filings due in 90 days', source: 'Quorum Business', date: '2026-07-01' },
      { title: 'Model providers split on whether the tiering rules are workable', source: 'Bench Report', date: '2026-07-04' },
      { title: 'Smaller labs warn compliance cost lands hardest on them', source: 'Signal & Trade', date: '2026-07-09' },
      { title: 'Regulator publishes the first conformity template', source: 'The Ledger', date: '2026-07-18' },
    ],
    angles: ['Compliance cost', 'Registry rules', 'Industry response', 'Enforcement'],
    keywords: ['ai', 'regulation', 'compliance', 'policy', 'models'],
  },
  {
    id: 'ardsley-cup-final',
    title: 'Ardsley win the cup on a replayed penalty',
    summary:
      'A 94th-minute retake settled the final and reopened the argument about video review.',
    category: 'Sport',
    region: 'Europe',
    startedAt: '2026-08-01',
    windowDays: 5,
    articleCount: 180,
    sourceCount: 22,
    sentiment: 'positive',
    heat: 68,
    sources: ['Pitchside', 'Cable 9', 'The Ledger'],
    headlines: [
      { title: 'Ardsley take the cup after a 94th-minute penalty retake', source: 'Pitchside', date: '2026-08-01' },
      { title: 'Referees body defends the retake as "textbook"', source: 'Cable 9', date: '2026-08-02' },
      { title: 'Video review rules go back to committee in September', source: 'The Ledger', date: '2026-08-03' },
    ],
    angles: ['Match report', 'Video review', 'Referee reaction'],
    keywords: ['football', 'cup', 'penalty', 'var', 'final'],
  },
  {
    id: 'coastal-retreat-bill',
    title: 'Coastal retreat bill passes',
    summary:
      'A managed-retreat programme will buy out 11,000 shoreline properties over twelve years.',
    category: 'Climate',
    region: 'Americas',
    startedAt: '2026-06-19',
    windowDays: 20,
    articleCount: 1620,
    sourceCount: 104,
    sentiment: 'mixed',
    heat: 74,
    sources: ['Meridian Post', 'Civic Review', 'Terrain Journal', 'Northwire'],
    headlines: [
      { title: 'Coastal retreat bill passes after a two-year standoff', source: 'Civic Review', date: '2026-06-19' },
      { title: '11,000 properties in scope; buyouts begin with the worst-hit county', source: 'Meridian Post', date: '2026-06-22' },
      { title: 'Valuation formula draws the first legal challenge', source: 'Northwire', date: '2026-07-02' },
    ],
    angles: ['Buyout terms', 'Legal challenges', 'Local response', 'Funding'],
    keywords: ['coastal', 'retreat', 'flooding', 'buyout', 'sea level'],
  },
  {
    id: 'lumen-battery-recall',
    title: 'Lumen recalls 1.2m battery packs',
    summary:
      'A cell defect traced to one supplier line triggered the largest consumer recall in the company history.',
    category: 'Business',
    region: 'Global',
    startedAt: '2026-07-08',
    windowDays: 16,
    articleCount: 2050,
    sourceCount: 133,
    sentiment: 'negative',
    heat: 79,
    sources: ['Signal & Trade', 'Bench Report', 'Quorum Business', 'Cable 9', 'The Ledger'],
    headlines: [
      { title: 'Lumen recalls 1.2m battery packs over a cell defect', source: 'Signal & Trade', date: '2026-07-08' },
      { title: 'Defect traced to a single supplier line running since February', source: 'Bench Report', date: '2026-07-10' },
      { title: 'Replacement programme to run into next year, Lumen concedes', source: 'Quorum Business', date: '2026-07-15' },
      { title: 'Shares close down 9% as the recall estimate doubles', source: 'The Ledger', date: '2026-07-17' },
    ],
    angles: ['Recall logistics', 'Supplier audit', 'Market reaction', 'Regulatory action'],
    keywords: ['recall', 'battery', 'safety', 'manufacturing', 'defect'],
  },
  {
    id: 'orbital-debris-event',
    title: 'Orbital debris cascade in low orbit',
    summary:
      'A defunct upper stage broke apart, adding an estimated 3,400 trackable fragments to a busy shell.',
    category: 'Science',
    region: 'Global',
    startedAt: '2026-05-24',
    windowDays: 22,
    articleCount: 1310,
    sourceCount: 88,
    sentiment: 'negative',
    heat: 72,
    sources: ['Terrain Journal', 'Northwire', 'Bench Report', 'The Ledger'],
    headlines: [
      { title: 'Defunct upper stage breaks apart in a busy orbital shell', source: 'Terrain Journal', date: '2026-05-24' },
      { title: '3,400 trackable fragments added; three operators shift altitude', source: 'Bench Report', date: '2026-05-27' },
      { title: 'Debris-removal contract brought forward by eighteen months', source: 'Northwire', date: '2026-06-08' },
    ],
    angles: ['Fragment tracking', 'Collision avoidance', 'Removal contracts'],
    keywords: ['orbit', 'debris', 'satellite', 'space', 'collision'],
  },
  {
    id: 'delta-basin-drought',
    title: 'Delta basin drought enters third year',
    summary:
      'Reservoir storage fell below 19%, and allocation cuts moved from agriculture to municipal supply.',
    category: 'Climate',
    region: 'Asia',
    startedAt: '2026-06-02',
    windowDays: 26,
    articleCount: 1880,
    sourceCount: 112,
    sentiment: 'negative',
    heat: 77,
    sources: ['Meridian Post', 'Terrain Journal', 'Continental Health', 'Northwire'],
    headlines: [
      { title: 'Delta basin storage falls below 19% for the first time', source: 'Terrain Journal', date: '2026-06-02' },
      { title: 'Allocation cuts reach municipal supply in six districts', source: 'Meridian Post', date: '2026-06-11' },
      { title: 'Rice acreage down a fifth as growers switch or fallow', source: 'Northwire', date: '2026-06-21' },
      { title: 'Emergency transfer agreed with the northern basin', source: 'Continental Health', date: '2026-07-04' },
    ],
    angles: ['Water allocation', 'Agriculture', 'Municipal supply', 'Transfer deals'],
    keywords: ['drought', 'water', 'reservoir', 'agriculture', 'basin'],
  },
  {
    id: 'quorum-election-recount',
    title: 'Quorum province recount ordered',
    summary:
      'A 412-vote margin triggered a full manual recount across 1,900 precincts.',
    category: 'World',
    region: 'Americas',
    startedAt: '2026-07-19',
    windowDays: 15,
    articleCount: 2410,
    sourceCount: 147,
    sentiment: 'neutral',
    heat: 83,
    sources: ['Civic Review', 'Cable 9', 'Northwire', 'The Ledger', 'Meridian Post'],
    headlines: [
      { title: 'Quorum province orders a full manual recount on a 412-vote margin', source: 'Civic Review', date: '2026-07-19' },
      { title: '1,900 precincts, fourteen days: how the recount will run', source: 'Cable 9', date: '2026-07-21' },
      { title: 'Both campaigns send observers as the first boxes open', source: 'Northwire', date: '2026-07-24' },
      { title: 'Recount narrows the margin to 388 with a third counted', source: 'The Ledger', date: '2026-07-30' },
    ],
    angles: ['Recount process', 'Legal filings', 'Campaign response', 'Certification'],
    keywords: ['election', 'recount', 'vote', 'margin', 'precinct'],
  },
  {
    id: 'harbourline-strike',
    title: 'Harbourline rail strike',
    summary:
      'Nine days of stoppages over rostering rules halted freight on the busiest corridor in the country.',
    category: 'Business',
    region: 'Europe',
    startedAt: '2026-07-11',
    windowDays: 13,
    articleCount: 1540,
    sourceCount: 99,
    sentiment: 'negative',
    heat: 70,
    sources: ['Northwire', 'Estuary Daily', 'Quorum Business', 'Civic Review'],
    headlines: [
      { title: 'Harbourline drivers begin nine days of stoppages over rostering', source: 'Northwire', date: '2026-07-11' },
      { title: 'Freight backs up at three ports as the corridor closes', source: 'Quorum Business', date: '2026-07-13' },
      { title: 'Mediator appointed after the second round collapses', source: 'Civic Review', date: '2026-07-18' },
    ],
    angles: ['Rostering dispute', 'Freight impact', 'Mediation', 'Passenger fallout'],
    keywords: ['strike', 'rail', 'freight', 'union', 'rostering'],
  },
  {
    id: 'verdant-forest-fund',
    title: 'Verdant forest fund oversubscribed',
    summary:
      'A $6bn restoration fund closed at twice its target, with half the capital committed to a single basin.',
    category: 'Climate',
    region: 'Americas',
    startedAt: '2026-05-15',
    windowDays: 19,
    articleCount: 940,
    sourceCount: 71,
    sentiment: 'positive',
    heat: 63,
    sources: ['Quorum Business', 'Terrain Journal', 'The Ledger'],
    headlines: [
      { title: 'Verdant restoration fund closes at $6bn, twice its target', source: 'Quorum Business', date: '2026-05-15' },
      { title: 'Half the capital heads to a single basin — critics call it narrow', source: 'Terrain Journal', date: '2026-05-19' },
      { title: 'First disbursements tied to satellite-verified canopy cover', source: 'The Ledger', date: '2026-05-29' },
    ],
    angles: ['Fund structure', 'Verification', 'Local partners'],
    keywords: ['forest', 'restoration', 'fund', 'carbon', 'investment'],
  },
  {
    id: 'northgate-data-breach',
    title: 'Northgate breach exposes 31m records',
    summary:
      'A payroll provider disclosed a nine-week intrusion affecting employers across three continents.',
    category: 'Tech',
    region: 'Global',
    startedAt: '2026-06-25',
    windowDays: 17,
    articleCount: 2190,
    sourceCount: 136,
    sentiment: 'negative',
    heat: 80,
    sources: ['Bench Report', 'Signal & Trade', 'Northwire', 'The Ledger', 'Cable 9'],
    headlines: [
      { title: 'Northgate discloses a nine-week intrusion affecting 31m records', source: 'Bench Report', date: '2026-06-25' },
      { title: 'Employers across three continents begin notifying staff', source: 'Signal & Trade', date: '2026-06-27' },
      { title: 'Attackers used a stale contractor credential, filing suggests', source: 'Northwire', date: '2026-07-02' },
      { title: 'Two regulators open parallel investigations', source: 'The Ledger', date: '2026-07-08' },
    ],
    angles: ['Intrusion timeline', 'Notification', 'Regulatory action', 'Class actions'],
    keywords: ['breach', 'security', 'payroll', 'data', 'intrusion'],
  },
  {
    id: 'solaris-launch-cadence',
    title: 'Solaris hits weekly launch cadence',
    summary:
      'Fifty-two orbital launches in a year, a first for any single operator, with reuse counts past twenty.',
    category: 'Science',
    region: 'Americas',
    startedAt: '2026-06-05',
    windowDays: 14,
    articleCount: 860,
    sourceCount: 64,
    sentiment: 'positive',
    heat: 66,
    sources: ['Terrain Journal', 'Bench Report', 'Northwire'],
    headlines: [
      { title: 'Solaris reaches 52 orbital launches in twelve months', source: 'Terrain Journal', date: '2026-06-05' },
      { title: 'One booster passes its twentieth flight with no refurbishment', source: 'Bench Report', date: '2026-06-09' },
      { title: 'Range operators warn scheduling is now the binding constraint', source: 'Northwire', date: '2026-06-16' },
    ],
    angles: ['Cadence records', 'Reuse economics', 'Range capacity'],
    keywords: ['launch', 'rocket', 'reuse', 'orbital', 'cadence'],
  },
  {
    id: 'lantern-museum-restitution',
    title: 'Lantern Museum returns 640 objects',
    summary:
      'The largest single restitution agreement to date will move collections over four years.',
    category: 'Culture',
    region: 'Europe',
    startedAt: '2026-05-28',
    windowDays: 21,
    articleCount: 1120,
    sourceCount: 83,
    sentiment: 'positive',
    heat: 64,
    sources: ['Civic Review', 'Meridian Post', 'The Ledger', 'Cable 9'],
    headlines: [
      { title: 'Lantern Museum agrees to return 640 objects over four years', source: 'Civic Review', date: '2026-05-28' },
      { title: 'Agreement covers provenance research costs for the first time', source: 'Meridian Post', date: '2026-06-01' },
      { title: 'Three other institutions open talks within a fortnight', source: 'The Ledger', date: '2026-06-12' },
    ],
    angles: ['Restitution terms', 'Provenance research', 'Sector response'],
    keywords: ['museum', 'restitution', 'heritage', 'collection', 'provenance'],
  },
  {
    id: 'archer-antitrust-ruling',
    title: 'Archer antitrust ruling lands',
    summary:
      'A court ordered structural separation of the marketplace and logistics arms within eighteen months.',
    category: 'Business',
    region: 'Americas',
    startedAt: '2026-07-27',
    windowDays: 8,
    articleCount: 2890,
    sourceCount: 173,
    sentiment: 'mixed',
    heat: 89,
    sources: ['Quorum Business', 'The Ledger', 'Signal & Trade', 'Bench Report', 'Cable 9'],
    headlines: [
      { title: 'Court orders Archer to separate marketplace and logistics', source: 'Quorum Business', date: '2026-07-27' },
      { title: 'Eighteen-month clock starts; Archer signals an appeal', source: 'The Ledger', date: '2026-07-28' },
      { title: 'Sellers weigh what separation means for fulfilment fees', source: 'Signal & Trade', date: '2026-07-30' },
      { title: 'Ruling cited in two pending cases within days', source: 'Bench Report', date: '2026-08-02' },
    ],
    angles: ['Separation order', 'Appeal path', 'Seller impact', 'Precedent'],
    keywords: ['antitrust', 'ruling', 'marketplace', 'separation', 'court'],
  },
  {
    id: 'copperline-mine-deal',
    title: 'Copperline mine deal signed',
    summary:
      'A twenty-year concession pairs a smelter build with a revenue-share formula tied to the copper price.',
    category: 'Business',
    region: 'Africa',
    startedAt: '2026-06-16',
    windowDays: 18,
    articleCount: 780,
    sourceCount: 58,
    sentiment: 'mixed',
    heat: 59,
    sources: ['Continental Health', 'Quorum Business', 'Northwire', 'The Ledger'],
    headlines: [
      { title: 'Copperline concession signed with a smelter build attached', source: 'Quorum Business', date: '2026-06-16' },
      { title: 'Revenue share floats with the copper price — a first for the region', source: 'Northwire', date: '2026-06-20' },
      { title: 'Community consultation record challenged in court', source: 'Continental Health', date: '2026-06-30' },
    ],
    angles: ['Concession terms', 'Smelter build', 'Community consultation'],
    keywords: ['mining', 'copper', 'concession', 'smelter', 'royalties'],
  },
  {
    id: 'aurora-power-outage',
    title: 'Aurora grid outage hits 4m homes',
    summary:
      'A cascading fault during a heat event left four million homes dark for up to nineteen hours.',
    category: 'World',
    region: 'Asia',
    startedAt: '2026-07-05',
    windowDays: 11,
    articleCount: 2330,
    sourceCount: 145,
    sentiment: 'negative',
    heat: 85,
    sources: ['Northwire', 'Cable 9', 'Meridian Post', 'Terrain Journal', 'Civic Review'],
    headlines: [
      { title: 'Cascading fault leaves four million homes without power', source: 'Northwire', date: '2026-07-05' },
      { title: 'Peak demand during the heat event broke the previous record twice', source: 'Terrain Journal', date: '2026-07-06' },
      { title: 'Operator says a protection relay misfired at the first substation', source: 'Cable 9', date: '2026-07-09' },
      { title: 'Regulator orders an independent review of the restoration plan', source: 'Civic Review', date: '2026-07-14' },
    ],
    angles: ['Fault sequence', 'Heat demand', 'Restoration', 'Regulatory review'],
    keywords: ['grid', 'outage', 'power', 'blackout', 'heatwave'],
  },
  {
    id: 'seabed-mining-moratorium',
    title: 'Seabed mining moratorium extended',
    summary:
      'Member states extended the pause another three years while a benthic impact framework is drafted.',
    category: 'Climate',
    region: 'Global',
    startedAt: '2026-05-08',
    windowDays: 16,
    articleCount: 1040,
    sourceCount: 79,
    sentiment: 'positive',
    heat: 62,
    sources: ['Terrain Journal', 'Harbour Watch', 'Meridian Post', 'The Ledger'],
    headlines: [
      { title: 'Members extend the seabed mining pause by three years', source: 'Terrain Journal', date: '2026-05-08' },
      { title: 'Two contractors say their exploration licences are now stranded', source: 'Harbour Watch', date: '2026-05-12' },
      { title: 'Benthic impact framework due before the next assembly', source: 'Meridian Post', date: '2026-05-20' },
    ],
    angles: ['Moratorium terms', 'Contractor response', 'Impact framework'],
    keywords: ['seabed', 'mining', 'moratorium', 'ocean', 'benthic'],
  },
  {
    id: 'novara-transfer-record',
    title: 'Novara break the transfer record',
    summary:
      'A €218m move reset the market ceiling and reopened the argument about spending controls.',
    category: 'Sport',
    region: 'Europe',
    startedAt: '2026-07-16',
    windowDays: 12,
    articleCount: 1690,
    sourceCount: 102,
    sentiment: 'mixed',
    heat: 73,
    sources: ['Pitchside', 'Cable 9', 'Quorum Business', 'The Ledger'],
    headlines: [
      { title: 'Novara agree a €218m move, resetting the transfer ceiling', source: 'Pitchside', date: '2026-07-16' },
      { title: 'Spending-control rules face their first real test', source: 'Quorum Business', date: '2026-07-18' },
      { title: 'Two clubs signal they will contest the amortisation treatment', source: 'The Ledger', date: '2026-07-23' },
    ],
    angles: ['Transfer terms', 'Spending rules', 'Club reaction'],
    keywords: ['transfer', 'football', 'record', 'spending', 'club'],
  },
  {
    id: 'crescent-film-strike',
    title: 'Crescent studios strike ends',
    summary:
      'A 118-day stoppage closed with the first contractual limits on synthetic performer likenesses.',
    category: 'Culture',
    region: 'Americas',
    startedAt: '2026-06-08',
    windowDays: 20,
    articleCount: 1370,
    sourceCount: 94,
    sentiment: 'positive',
    heat: 69,
    sources: ['Cable 9', 'Civic Review', 'The Ledger', 'Bench Report'],
    headlines: [
      { title: 'Crescent studios strike ends after 118 days', source: 'Cable 9', date: '2026-06-08' },
      { title: 'Deal sets the first contractual limits on synthetic likenesses', source: 'Bench Report', date: '2026-06-09' },
      { title: 'Production restarts phased over six weeks', source: 'Civic Review', date: '2026-06-15' },
      { title: 'Residual formula rewritten for streaming-first releases', source: 'The Ledger', date: '2026-06-24' },
    ],
    angles: ['Deal terms', 'Synthetic likeness', 'Production restart', 'Residuals'],
    keywords: ['strike', 'studio', 'film', 'likeness', 'residuals'],
  },
  {
    id: 'helix-protein-release',
    title: 'Helix opens its protein model',
    summary:
      'Weights and training data for a structure-prediction model were released without a use restriction.',
    category: 'Tech',
    region: 'Global',
    startedAt: '2026-07-24',
    windowDays: 10,
    articleCount: 1450,
    sourceCount: 97,
    sentiment: 'positive',
    heat: 78,
    sources: ['Bench Report', 'Lancet Wire', 'Signal & Trade', 'Terrain Journal'],
    headlines: [
      { title: 'Helix releases protein-structure weights with no use restriction', source: 'Bench Report', date: '2026-07-24' },
      { title: 'Three labs reproduce the benchmark within seventy-two hours', source: 'Lancet Wire', date: '2026-07-27' },
      { title: 'Biosecurity researchers ask for a staged-release norm', source: 'Signal & Trade', date: '2026-07-30' },
    ],
    angles: ['Model release', 'Reproduction', 'Biosecurity debate'],
    keywords: ['protein', 'model', 'open weights', 'biology', 'structure'],
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
  if (e.category.toLowerCase().includes(q) || e.region.toLowerCase().includes(q)) return 35
  if (e.summary.toLowerCase().includes(q)) return 20
  if (e.headlines.some((h) => h.title.toLowerCase().includes(q))) return 10
  return 0
}
