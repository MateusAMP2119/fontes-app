# Feed research and construction

The `/new-feed` screen combines the Fontes website search card with the researched Feedly Research answer pattern and AI Feeds criteria editor.

## Reference provenance

The card comes from the local `fontes-spa` checkout. Its 552px width, 113px height, 57px input row, 56px action row, 20px corners, segmented control and recessed content/period drawer are preserved. Controls use the app-required OpenAI icon set. Theme colors and the shared crossfade follow the app conventions.

Reference file SHA-256 hashes at implementation:
- `src/components/Search.astro`: `0986b39c325c9f018cbc467d22d404a3a1100fac936890ddfdbdfcc3c87e3799`
- `src/styles/global.css`: `c0dfc45bc14590784b5acebbf67beaf1951e55d5573b2cac0d4482cda1973dca`
- `src/scripts/query.ts`: `6db8af63b3c079a31522336747bcee25aa08b6da1d3d51d843507d0aa2ba29df`

Feedly research reference: https://feedly.com/i/research?query=Jason+wong, inspected in the signed-in Safari session. Answer pattern: submitted query, collapsible search evidence, paragraphs with numbered citations and a persistent composer. AI Feeds criteria references remain documented in `artifacts/feed-composer/feedly-reference/README.md`.

## Behavior

- Before a request starts, both modes show four stories above the search card, leading with the three briefing highlights and adding the next unique news headline, using the shared `StoryRow` and `StorySkeleton` components from the standard feed. Ranked story IDs are resolved through `/stories` searches and checked for an exact ID match. The section matches the input width (640px maximum), with compact two-column rows that stack on narrow screens. The rows retain feed navigation, images and publishers. Dates, sentiment and popularity metrics are disabled in this section; standard feeds retain them. Reads retry automatically and are cancelled when the initial view closes.

- Both Procurar and Construir show “Começar com”, aligned with the row text, and up to six outlined headline buttons below the initial search card. `loadResearchTopics` eagerly reads `/briefing-facts` highlights and six `/stories` results in parallel, puts the ranked highlights first, deduplicates story IDs, and caps the list at six. Selecting a headline submits it in the active mode. The loader is the replacement point for a future dedicated suggestions endpoint. Loading and failed reads retain six skeletons, retry automatically, and abort when the suggestions leave the view.
- Procurar: interpret the query, search the Fontes catalogue in the selected content collection and period, compose an answer grounded in the retrieved titles and summaries, and expose citations and sources.
- Construir: interpret the description, look up named entities, mark exact catalogue matches and ambiguous names, and populate editable AND/OR/NOT groups. Entity matches are annotations; preview filtering remains keyword-based on titles and summaries.
- Missing or ambiguous entity names are never presented as verified identities. No invented entity IDs or source URLs come from the model.
- New requests, mode changes and cancellation stop the previous retry loop. Existing results and edited criteria survive mode switches. Reads retry automatically with skeletons.
- The research collection is bounded to 24 evidence records. The feed preview is bounded to 20 candidates. Counts describe those results, not corpus-wide totals.
- Save remains a browser-local draft, including the content and period filters. It does not create a workspace feed or scheduled monitoring job.

## API and deployment

The new authenticated `POST /api/research` is implemented in the active briefing-enabled API checkout:
`/Users/mateuscosta/Documents/ChatGPT/Fontes general work/work/fontes-api`.
It reuses the existing AI binding and Gemma model, the news `/search` endpoint, verified bearer sessions, bounded payloads and response validation. No new credentials, databases or external providers are required.

The app calls `https://api.fonteslabs.com/api/research`. The API code must be deployed from that checkout before the AI modes work against the public API. This task made local changes and performed a dry-run build, not a production deployment.
