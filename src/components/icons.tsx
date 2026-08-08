/** Inline stroke icons */

const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

type IconProps = { size?: number; className?: string }

function Svg({ size = 18, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Sidebar glyph whose left panel fills in while the boards panel is open. */
export function IconSidebarToggle({ size, open }: IconProps & { open: boolean }) {
  return (
    <Svg size={size} className={`sidebar-toggle-icon${open ? ' is-open' : ''}`}>
      <rect
        className="sidebar-toggle-fill"
        x="4.6"
        y="5.6"
        width="3.4"
        height="12.8"
        rx="0.9"
        fill="currentColor"
      />
      <rect x="3" y="4" width="18" height="16" rx="2" {...stroke} />
      <path d="M9 4v16" {...stroke} />
    </Svg>
  )
}

export function IconTrash({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 7h16" {...stroke} />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" {...stroke} />
      <path d="M7 7l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12" {...stroke} />
    </Svg>
  )
}

export function IconSticky({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M5 4h10l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" {...stroke} />
      <path d="M14 4v5h5" {...stroke} />
    </Svg>
  )
}

export function IconPen({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 19l7-7 2 2-7 7H12v-2z" {...stroke} />
      <path d="M16.5 9.5l2 2" {...stroke} />
      <path d="M4 20h4" {...stroke} />
    </Svg>
  )
}

export function IconPlus({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 6v12M6 12h12" {...stroke} />
    </Svg>
  )
}

export function IconShare({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="18" cy="6" r="2.5" {...stroke} />
      <circle cx="6" cy="12" r="2.5" {...stroke} />
      <circle cx="18" cy="18" r="2.5" {...stroke} />
      <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" {...stroke} />
    </Svg>
  )
}

export function IconGrid({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="4" y="4" width="6" height="6" rx="1" {...stroke} />
      <rect x="14" y="4" width="6" height="6" rx="1" {...stroke} />
      <rect x="4" y="14" width="6" height="6" rx="1" {...stroke} />
      <rect x="14" y="14" width="6" height="6" rx="1" {...stroke} />
    </Svg>
  )
}

/** 3x3 dot lattice — the dashboard grid-overlay toggle. */
export function IconGridDots({ size }: IconProps) {
  return (
    <Svg size={size}>
      {[5, 12, 19].flatMap((y) =>
        [5, 12, 19].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="currentColor" />
        )),
      )}
    </Svg>
  )
}

export function IconFolder({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-11z"
        {...stroke}
      />
    </Svg>
  )
}

export function IconFolderPlus({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.5h8a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-11z"
        {...stroke}
      />
      <path d="M12 11v5M9.5 13.5h5" {...stroke} />
    </Svg>
  )
}

export function IconTag({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h5.3a1.5 1.5 0 0 1 1.06.44l7.2 7.2a1.5 1.5 0 0 1 0 2.12l-5.3 5.3a1.5 1.5 0 0 1-2.12 0l-7.2-7.2A1.5 1.5 0 0 1 4 10.8V5.5z"
        {...stroke}
      />
      <circle cx="9" cy="9" r="1.25" {...stroke} />
    </Svg>
  )
}

export function IconSearch({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="10.75" cy="10.75" r="5.75" {...stroke} />
      <path d="M15 15l4.5 4.5" {...stroke} />
    </Svg>
  )
}

export function IconArrowUp({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 19V5M6 11l6-6 6 6" {...stroke} />
    </Svg>
  )
}

export function IconX({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M7 7l10 10M17 7L7 17" {...stroke} />
    </Svg>
  )
}

export function IconPhone({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="7" y="3" width="10" height="18" rx="2.5" {...stroke} />
      <path d="M10.5 5.5h3" {...stroke} />
    </Svg>
  )
}

export function IconCloud({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M7.5 18h9a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.7 1.5A3.5 3.5 0 0 0 7.5 18z"
        {...stroke}
      />
    </Svg>
  )
}
