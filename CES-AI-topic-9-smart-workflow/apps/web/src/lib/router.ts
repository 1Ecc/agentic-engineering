import { ref, computed } from 'vue'

export interface RouteState {
  path: string
  query: Record<string, string>
  hash: string
}

function parseHash(): RouteState {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [pathPart, queryPart = ''] = raw.split('?')
  const query: Record<string, string> = {}
  for (const segment of queryPart.split('&')) {
    if (!segment) continue
    const [k, v = ''] = segment.split('=')
    query[decodeURIComponent(k)] = decodeURIComponent(v)
  }
  return { path: pathPart || '/', query, hash: raw }
}

const state = ref<RouteState>(parseHash())

window.addEventListener('hashchange', () => {
  state.value = parseHash()
})

if (!window.location.hash) {
  window.location.hash = '#/workflows'
}

export function useRoute() {
  return computed(() => state.value)
}

export function navigate(path: string, query: Record<string, string> = {}): void {
  const queryString = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  const target = queryString ? `${path}?${queryString}` : path
  if (window.location.hash === `#${target}`) {
    state.value = parseHash()
    return
  }
  window.location.hash = `#${target}`
}

export function matchRoute(currentPath: string, pattern: string): Record<string, string> | null {
  const cs = currentPath.split('/').filter(Boolean)
  const ps = pattern.split('/').filter(Boolean)
  if (cs.length !== ps.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < ps.length; i += 1) {
    if (ps[i].startsWith(':')) {
      params[ps[i].slice(1)] = decodeURIComponent(cs[i])
    } else if (ps[i] !== cs[i]) {
      return null
    }
  }
  return params
}
