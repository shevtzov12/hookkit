import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseEnabled } from "@/lib/db/client";
import { forms } from "@/lib/db/schema";
import { DEMO_FORM_SLUG } from "@/lib/mock-data";

export interface FormSettings {
  redirectUrl?: string;
  turnstileEnabled?: boolean;
  emailNotify?: boolean;
  notifyEmail?: string;
  webhookOnSubmit?: boolean;
  webhookUrl?: string;
}

const DEFAULT_FORM_SETTINGS: Record<string, FormSettings> = {
  [DEMO_FORM_SLUG]: { redirectUrl: "/thank-you", turnstileEnabled: false },
};

function getDataDir(): string {
  return process.env.HOOKKIT_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function getSettingsFile(): string {
  return path.join(getDataDir(), "form-settings.json");
}

async function readFileSettings(): Promise<Record<string, FormSettings>> {
  const file = getSettingsFile();
  await mkdir(getDataDir(), { recursive: true });
  try {
    const raw = await readFile(file, "utf8");
    return { ...DEFAULT_FORM_SETTINGS, ...(JSON.parse(raw) as Record<string, FormSettings>) };
  } catch {
    return { ...DEFAULT_FORM_SETTINGS };
  }
}

export async function getFormSettings(publicId: string): Promise<FormSettings> {
  if (isDatabaseEnabled()) {
    const db = getDb();
    const [row] = await db
      .select({ settings: forms.settings })
      .from(forms)
      .where(eq(forms.publicId, publicId))
      .limit(1);

    if (row?.settings && typeof row.settings === "object") {
      return row.settings as FormSettings;
    }
    return DEFAULT_FORM_SETTINGS[publicId] ?? {};
  }

  const all = await readFileSettings();
  return all[publicId] ?? {};
}

export async function setFormSettings(
  publicId: string,
  settings: FormSettings,
): Promise<void> {
  if (isDatabaseEnabled()) {
    const db = getDb();
    await db
      .update(forms)
      .set({ settings })
      .where(eq(forms.publicId, publicId));
    return;
  }

  const all = await readFileSettings();
  all[publicId] = settings;
  await writeFile(getSettingsFile(), JSON.stringify(all, null, 2), "utf8");
}
