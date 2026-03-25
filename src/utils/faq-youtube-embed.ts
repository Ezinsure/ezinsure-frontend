/**
 * Build a YouTube embed URL from youtu.be or youtube.com/watch links.
 * Preserves `t` / `start` query as `?start=` (seconds) for the iframe.
 */
export function getFaqYoutubeEmbedUrl(url: string): string {
  if (!url?.trim()) return '';
  try {
    const normalized = url.includes('://') ? url : `https://${url}`;
    const u = new URL(normalized);
    let videoId = '';
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      videoId = u.pathname.replace(/^\//, '').split('/')[0] ?? '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      videoId = u.searchParams.get('v') ?? '';
    }

    let start: number | undefined;
    const t = u.searchParams.get('t');
    if (t) {
      const m = t.match(/^(\d+)/);
      if (m) start = parseInt(m[1], 10);
    }
    const st = u.searchParams.get('start');
    if (st != null && start === undefined) {
      const n = parseInt(st, 10);
      if (Number.isFinite(n)) start = n;
    }

    if (!videoId) {
      const youtuBe = url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^/?&]+)/);
      if (youtuBe?.[1]) videoId = youtuBe[1];
    }
    if (!videoId) {
      const watch = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/);
      if (watch?.[1]) videoId = watch[1];
    }
    if (!videoId) return url.trim();

    const startQs =
      start != null && Number.isFinite(start) && start > 0 ? `?start=${start}` : '';
    return `https://www.youtube.com/embed/${videoId}${startQs}`;
  } catch {
    return url.trim();
  }
}
