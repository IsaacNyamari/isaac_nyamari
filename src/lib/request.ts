/** Best-effort client IP behind common reverse proxies. Used only for hashing/rate limiting. */
export function clientIp(source: Request | Headers) {
  const h = source instanceof Headers ? source : source.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Cross-site request protection for state-changing route handlers: the Origin (or Referer)
 * must match the Host the request was sent to.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return Boolean(host) && o.host === host;
  } catch {
    return false;
  }
}
