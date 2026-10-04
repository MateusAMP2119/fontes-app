import { SettingsCog, Moon, Sun } from './components/icons'

const icons = { settings: SettingsCog, moon: Moon, sun: Sun }

export function DashboardIcon({ name }: { name: keyof typeof icons }) {
  const Icon = icons[name]
  return <Icon aria-hidden="true" />
}
