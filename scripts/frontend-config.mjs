export function productionApi(environment) {
  try {
    if (Object.keys(environment).some(name => name.startsWith('VITE_') && name !== 'VITE_API_URL')) throw Error()
    const url = new URL(environment.VITE_API_URL)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/api/v1') throw Error()
    return { apiOrigin: url.origin }
  } catch { throw Error('Production build requires VITE_API_URL as an HTTPS /api/v1 URL; no other VITE_ variables are allowed') }
}
