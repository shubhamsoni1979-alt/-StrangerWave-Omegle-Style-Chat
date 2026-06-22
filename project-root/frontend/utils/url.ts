/**
 * Resolves the backend URL dynamically.
 * If the application is accessed via a local network IP (e.g. 192.168.x.x, 10.x.x.x, 172.x.x.x, or a .local domain),
 * it dynamically routes to the backend on that same local IP on port 3001.
 * Otherwise, if we are on a remote production server, it resolves to the production railway backend.
 */
export function getBackendUrl(configBackendUrl: string): string {
  if (typeof window === "undefined") return configBackendUrl;

  const hostname = window.location.hostname;

  // Detect local IP address or local hostname
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") || // 172.16.0.0 - 172.31.255.255 (local range)
    hostname.endsWith(".local");

  if (isLocal) {
    // If the browser hostname is a local IP, use that hostname with port 3001
    try {
      const urlObj = new URL(configBackendUrl);
      urlObj.hostname = hostname;
      return urlObj.toString();
    } catch {
      return `http://${hostname}:3001`;
    }
  }

  // Production fallback: if hostname is not local, but config URL still points to localhost,
  // we redirect to the production backend URL.
  if (configBackendUrl.includes("localhost") || configBackendUrl.includes("127.0.0.1")) {
    return "https://strangerwave-omegle-style-chat-production.up.railway.app";
  }

  return configBackendUrl;
}
