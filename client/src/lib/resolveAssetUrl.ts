export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}
