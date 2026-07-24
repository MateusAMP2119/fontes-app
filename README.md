# Fontes

Freeform canvas shell for building views on Iris. Visual language follows Apple Freeform: full-bleed dotted board, floating pills, SF Pro system stack.

## Stack

- Vite + React 19 + TypeScript
- Vitest for pure camera helpers (`src/camera/`)

## Scripts

```sh
npm install
npm run dev       # http://localhost:5173
npm run build
npm run preview
npm test
```

## Shell (current)

- Full freeform stage (white + subtle dots)
- Top-left title chip (editable project name)
- Bottom taskbar:
  - left: zoom controls
  - center: tools (from Freeform’s top bar — presentational only)
  - right: collaborate / pages / share
- Pan (drag) + wheel zoom toward cursor (camera math tested)

No tool behavior yet — chrome is the product of this milestone.
