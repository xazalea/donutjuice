/**
 * CORS Proxy Utility
 * Wraps URLs with corsproxy.io to handle CORS issues
 * Based on: https://corsproxy.io/
 */

/**
 * Wrap a URL with corsproxy.io to bypass CORS restrictions
 * @param url The original URL to proxy
 * @returns The proxied URL
 */
export function proxyUrl(url: string): string {
  // Don't proxy if already proxied or if it's a relative URL
  if (url.includes('corsproxy.io') || url.startsWith('/') || url.startsWith('./')) {
    return url;
  }
  
  return `https://corsproxy.io/?${encodeURIComponent(url)}`;
}

/**
 * Fetch with automatic CORS proxy fallback
 * @param url The URL to fetch
 * @param options Fetch options
 * @param useProxy Whether to use proxy (default: true)
 * @returns Fetch response
 */
export async function fetchWithProxy(
  url: string,
  options?: RequestInit,
  useProxy: boolean = true
): Promise<Response> {
  // Try direct fetch first if not using proxy
  if (!useProxy) {
    try {
      return await fetch(url, options);
    } catch (error) {
      // If direct fails, try with proxy
      console.warn('Direct fetch failed, trying with CORS proxy:', error);
      return await fetch(proxyUrl(url), options);
    }
  }
  
  // Try with proxy first
  try {
    return await fetch(proxyUrl(url), options);
  } catch (proxyError) {
    // If proxy fails, try direct (might work if CORS is allowed)
    console.warn('CORS proxy failed, trying direct:', proxyError);
    try {
      return await fetch(url, options);
    } catch (directError) {
      // Both failed, throw the proxy error
      throw proxyError;
    }
  }
}

/**
 * Check if a URL needs CORS proxy
 * @param url The URL to check
 * @returns True if URL is external and might need proxy
 */
export function needsProxy(url: string): boolean {
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return false; // Relative URL, no proxy needed
  }
  
  if (url.includes('corsproxy.io')) {
    return false; // Already proxied
  }
  
  try {
    const urlObj = new URL(url);
    // Check if it's a different origin
    if (typeof window !== 'undefined') {
      return urlObj.origin !== window.location.origin;
    }
    return true; // Assume needs proxy if we can't check
  } catch {
    return false; // Invalid URL, don't proxy
  }
}

