import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readPreference(): ThemePreference {
  const saved = window.localStorage.getItem('ideagora-theme')
  return saved === 'light' || saved === 'dark' || saved === 'system'
    ? saved
    : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)

  useEffect(() => {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      document.documentElement.dataset.theme =
        preference === 'system'
          ? systemTheme.matches
            ? 'dark'
            : 'light'
          : preference
    }

    applyTheme()
    window.localStorage.setItem('ideagora-theme', preference)
    systemTheme.addEventListener('change', applyTheme)
    return () => systemTheme.removeEventListener('change', applyTheme)
  }, [preference])

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {children}
      <ThemeSwitcher />
    </ThemeContext.Provider>
  )
}

function ThemeSwitcher() {
  const context = useContext(ThemeContext)
  if (!context) return null

  const Icon =
    context.preference === 'light'
      ? Sun
      : context.preference === 'dark'
        ? Moon
        : Monitor

  return (
    <label className="theme-switcher">
      <Icon size={16} aria-hidden="true" />
      <span className="visually-hidden">Apariencia</span>
      <select
        aria-label="Tema de color"
        value={context.preference}
        onChange={(event) => {
          const value = event.currentTarget.value
          if (value === 'light' || value === 'dark' || value === 'system') {
            context.setPreference(value)
          }
        }}
      >
        <option value="system">Sistema</option>
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
      </select>
    </label>
  )
}
