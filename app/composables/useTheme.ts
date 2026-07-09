import { ref } from 'vue'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'teleflow-theme'
// Module-level singleton so all callers share one reactive value
const theme = ref<ThemeMode>('dark')

function applyTheme(mode: ThemeMode) {
  theme.value = mode
  if (import.meta.client) {
    document.documentElement.classList.toggle('theme-light', mode === 'light')
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {}
  }
}

export function useTheme() {
  const init = () => {
    if (!import.meta.client) return
    let saved: ThemeMode | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    } catch {}
    applyTheme(saved === 'light' ? 'light' : 'dark')
  }

  const toggle = () => applyTheme(theme.value === 'dark' ? 'light' : 'dark')

  return { theme, init, toggle, applyTheme }
}
