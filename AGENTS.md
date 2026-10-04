# Fontes repository instructions

These instructions apply to the entire repository. The visualization-card layout rules below are an architectural contract. Preserve them when adding, changing, or reviewing dashboard widgets.

## Horizontal visualization grid

- Every visualization card rendered with the `horizontal` variant must use the shared equal-column grid.
- A horizontal card has exactly:
  - **2 or 3 columns** this depends on requirments.
- Columns must be equal width.
- Card padding is `16px`, and the gutter between columns is `16px`.
- `cardColumns()` in `src/components/viz/shared/charts.tsx` is the single source of truth for the column count and usable column width.
- Pass the result of `cardColumns()` to `Shell` through its `columns` prop and use the shared horizontal row/grid styles in `src/components/viz/shared/shared.module.css`.
- Do not introduce per-card column breakpoints, percentage widths, guessed fixed widths, or duplicated grid definitions.

## Column roles

For a **2-column** horizontal card:

1. The first column contains the primary metric or primary content.
2. The second column contains the visualization or secondary statistics.

For a **3-column** horizontal card:

1. The first column contains the primary metric or primary content.
2. The second column is reserved for supporting copy or another clearly defined secondary section.
3. The third column contains the visualization or secondary statistics.

The trailing visualization or statistics section must remain on the final column. Do not move it into the middle track merely to fill empty space.

## Copy and column spanning

- Supporting copy may render in the middle column only on a 3-column card.
- Render supporting copy only when the complete text fits. Use `textFits(cols.colW, bodyH(item), copy)` or the shared equivalent; do not rely on clipping to hide overflow.
- It is valid for the middle column to remain empty when supporting copy does not fit.
- A section may span multiple columns only when that behavior is intentional for that card and uses whole-column math:
  - `cols.colW * span + GUTTER * (span - 1)`
- Never replace the shared grid with arbitrary fractions to remove visual whitespace.

## Chart sizing and alignment

- A chart occupying one track must use `cols.colW` as its width.
- Chart, copy, metric, and grid-guide alignment must resolve from the same shared column calculation.
- Preserve the dashboard-grid overlay guides. Their tracks and gaps must exactly match the card's real layout.
- Keep the card title row outside the body column guides.
- Prefer responsive typography and container-aware sizing. Do not stretch text with CSS transforms.

## Mobile dashboard

- The mobile dashboard is a single-column layout; do not reuse the desktop 2/3-column arrangement inside the phone frame.
- Preserve the original plain white canvas frame. Do not add phone chrome, an extra header, or an inner device surface.
- Mobile widget height must derive from the live card content width using the metric-specific mobile aspect ratio.
- Measure the true content width after side padding so internal typography and charts receive the same width the card visibly has.
- Keep the gap between desktop and mobile frames equal to the outer canvas edge spacing (`14px` in the current layout).

## Canonical fontes-app checkout

Persistent user instruction, saved 2026-09-13: the actual fontes-app folder is `/Users/mateuscosta/Development/iris-fontes/fontes-app`. Use this checkout for Fontes app changes. Do not use the copy under `Fontes general work/work/fontes-app`. Work directly in the actual folder without creating a new worktree unless explicitly requested.

## News loading and failures

Persistent user instruction, saved 2026-09-13: news counts, articles, rankings and briefings must show skeletons while loading or unavailable, and retry read requests automatically. Do not display loading/failure messages or manual retry buttons for these reads. Keep already loaded content visible. Cancel pending retries when their view or query is replaced.

## UI icons

Use OpenAI Apps SDK UI icons exclusively for application controls and navigation. Import them through `src/components/icons.tsx`. The unmodified upstream SVG components and MIT license are in `src/components/openai-icons/`. Add missing icons from that same pack. Do not introduce Lucide, another icon pack, or hand-drawn UI glyphs. Brand logos, publisher favicons, data visualizations and canvas drawings are content and retain their own rendering.

## UI update animations

Project-wide user requirement: visible state and layout updates use the shared 200 ms cross-fade through `transitionView` in `src/viewTransition.ts`. This includes rename commits, entering or leaving inline editing, sidebar changes, and configuration tabs. Keep related updates in one transition. Do not replace this with sliding, scaling, or independent CSS layout animations. Keep typing and caret movement immediate, and preserve the shared reduced-motion behavior.

Controls participating in these updates must disable inherited CSS transitions, including shared button `transition-all` styles. Width, height, padding, position, and transforms must change immediately inside the shared cross-fade, with no additional movement, resizing, scaling, or component entrance/exit animation. Check computed styles and animations when expanding or collapsing sidebars, including newly added controls.

Page names use a dynamic edge fade only when they overflow and remain stationary on hover and focus. Do not reintroduce looping or scrolling name animations. Sidebar page icons are display-only; icon editing remains in the main page header.

## Fontes copy: no motivational or filler headings

Persistent user instruction, saved 2026-09-22: motivational, rhetorical, and generic filler titles or subtitles are forbidden in Fontes product copy. Examples to avoid include “O que está a acontecer” and “Temas que marcam a atualidade”. Prefer actual news headlines, specific factual content, and necessary functional labels. Do not add introductory slogans or explanatory filler above content.
