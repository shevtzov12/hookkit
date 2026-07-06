import { readFile } from "fs/promises";
import path from "path";

export type StaticPolicySlug = "privacy-policy" | "terms-of-use" | "cookie-policy";

const LEGAL_DIR = path.join(process.cwd(), "content", "legal");

/** Strip accidental editor placeholder that comments out the whole export. */
function sanitizeStaticPolicyHtml(html: string): string {
  let out = html.trim();
  if (out.startsWith("<!-- Paste Terml")) {
    out = out.slice("<!-- Paste Terml".length).trimStart();
  }
  return out;
}

/** Termly "Copy HTML" export (free). Embed/data-id is paid — use these files instead. */
export async function readStaticPolicy(
  slug: StaticPolicySlug,
): Promise<string | null> {
  try {
    const raw = await readFile(path.join(LEGAL_DIR, `${slug}.html`), "utf-8");
    const html = sanitizeStaticPolicyHtml(raw);
    return html.length > 0 ? html : null;
  } catch {
    return null;
  }
}
