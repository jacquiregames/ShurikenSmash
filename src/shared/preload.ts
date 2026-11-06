const images = new Map<string, HTMLImageElement>();

/**
 * Starts downloading images so they are cached before they are shown. The elements are kept
 * (once per url), because a browser may drop an unreferenced image's request.
 */
export function preloadImages(urls: readonly string[]) {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (images.has(url)) continue;
    const image = new Image();
    image.src = url;
    images.set(url, image);
  }
}
