import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.goog",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return true;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  return false;
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) return isPrivateIpv6(address);
  return true;
}

export async function assertSafeOutboundUrl(urlString: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  if (url.username || url.password) {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname) return null;

  if (BLOCKED_HOSTNAMES.has(hostname)) return null;
  if (hostname.endsWith(".localhost")) return null;

  if (hostname.endsWith(".local")) return null;

  if (isIP(hostname)) {
    return isPrivateAddress(hostname) ? null : url;
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    for (const record of records) {
      if (isPrivateAddress(record.address)) return null;
    }
  } catch {
    return null;
  }

  return url;
}
