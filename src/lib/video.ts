/** Converts a YouTube watch/share URL into an embeddable URL. Returns null if it's not YouTube. */
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.slice(1)
      return `https://www.youtube.com/embed/${id}`
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v')
        return id ? `https://www.youtube.com/embed/${id}` : null
      }
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/')[2]
        return id ? `https://www.youtube.com/embed/${id}` : null
      }
      if (u.pathname.startsWith('/embed/')) {
        return url
      }
    }
    return null
  } catch {
    return null
  }
}
