import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach } from "vitest";

let testDataDir: string | null = null;

beforeEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  testDataDir = path.join(
    os.tmpdir(),
    `hookkit-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  process.env.HOOKKIT_DATA_DIR = testDataDir;
});

afterAll(async () => {
  if (testDataDir) {
    await rm(testDataDir, { recursive: true, force: true });
  }
});
