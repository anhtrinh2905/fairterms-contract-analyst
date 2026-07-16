import { createHash } from "node:crypto";

/**
 * Produce a hex-encoded SHA-256 hash of the given input string.
 * Used to create one-way fingerprints for tokens, IPs, and user-agents
 * so we never store the raw values in the database.
 */
export function createSha256Hash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Extract the client IP address from the request and return its SHA-256 hash.
 *
 * Checks headers in priority order:
 *   1. x-forwarded-for  (set by most reverse proxies / load balancers)
 *   2. x-real-ip        (common Nginx header)
 *
 * Returns `null` when no IP can be determined.
 */
export function getRequestIpHash(request: Request): string | null {
  const headers = request.headers;

  // x-forwarded-for may contain a comma-separated list; take the first (client) IP.
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const clientIp = forwarded.split(",")[0].trim();
    if (clientIp) return createSha256Hash(clientIp);
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return createSha256Hash(realIp.trim());

  return null;
}

/**
 * Extract the User-Agent header from the request and return its SHA-256 hash.
 * Returns `null` when no User-Agent header is present.
 */
export function getUserAgentHash(request: Request): string | null {
  const ua = request.headers.get("user-agent");
  if (!ua) return null;
  return createSha256Hash(ua);
}
