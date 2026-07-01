import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEMO_FORM_SLUG } from "@/lib/mock-data";
import { PUBLIC_ID_PATTERN } from "@/lib/webhooks/constants";

export interface UserFormRecord {
  id: string;
  publicId: string;
  name: string;
  createdAt: string;
}

interface FormRegistryData {
  forms: UserFormRecord[];
}

function getDataDir(): string {
  return process.env.HOOKKIT_DATA_DIR ?? path.join(process.cwd(), ".data");
}

function getRegistryFile(): string {
  return path.join(getDataDir(), "user-forms.json");
}

async function readRegistry(): Promise<FormRegistryData> {
  await mkdir(getDataDir(), { recursive: true });
  try {
    const raw = await readFile(getRegistryFile(), "utf8");
    return JSON.parse(raw) as FormRegistryData;
  } catch {
    return { forms: [] };
  }
}

async function writeRegistry(data: FormRegistryData): Promise<void> {
  await mkdir(getDataDir(), { recursive: true });
  await writeFile(getRegistryFile(), JSON.stringify(data, null, 2), "utf8");
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().slice(0, 6);
  return `frm_${base || "form"}_${suffix}`;
}

export async function listUserFormsFile(): Promise<UserFormRecord[]> {
  const registry = await readRegistry();
  return registry.forms;
}

export async function createUserFormFile(name: string): Promise<UserFormRecord> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("name required");

  let publicId = slugify(trimmed);
  const registry = await readRegistry();

  while (
    registry.forms.some((f) => f.publicId === publicId) ||
    publicId === DEMO_FORM_SLUG ||
    !PUBLIC_ID_PATTERN.test(publicId)
  ) {
    publicId = slugify(trimmed);
  }

  const record: UserFormRecord = {
    id: crypto.randomUUID(),
    publicId,
    name: trimmed,
    createdAt: new Date().toISOString(),
  };

  registry.forms.unshift(record);
  await writeRegistry(registry);

  const { setFormSettings } = await import("@/lib/forms/settings");
  await setFormSettings(publicId, { redirectUrl: "/thank-you" });

  return record;
}

export async function isFileStoreForm(publicId: string): Promise<boolean> {
  if (publicId === DEMO_FORM_SLUG) return true;
  const registry = await readRegistry();
  return registry.forms.some((f) => f.publicId === publicId);
}
