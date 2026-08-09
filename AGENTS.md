# Fontes repository instructions

These instructions apply to the entire repository. The visualization-card layout rules below are an architectural contract. Preserve them when adding, changing, or reviewing dashboard widgets.

## Horizontal visualization grid

- Every visualization card rendered with the `horizontal` variant must use the shared equal-column grid.
- A horizontal card has exactly:
  - **2 columns** when its card width is below `700px`.
  - **3 columns** when its card width is `700px` or greater.
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

## Verification

After changing visualization layout code:

- Run `npm run build`.
- Run `npm run lint` and report any remaining warnings.
- Visually verify horizontal cards on both sides of the breakpoint: below `700px` and at or above `700px` card width.
- Check that the 2-column and 3-column placements follow the roles above.
- Enable the dashboard-grid overlay and confirm its guides align with the rendered sections.
- Check for text clipping, chart overflow, and unintended empty-width hacks.
- When mobile layout is affected, verify at narrow, default, and wide phone-frame widths.
