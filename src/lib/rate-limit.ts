import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  FORM_SUBMISSIONS_PER_MONTH,
  WEBHOOK_EVENTS_PER_DAY,
} from "@/lib/limits/constants";

export interface RateLimitUsage {
  enabled: boolean;
  limit: number;
  remaining: number;
  used: number;
  reset: number | null;
}

export interface RateLimitCheckResult {
  success: boolean;
  reset?: number;
}

type RateLimitFn = (key: string) => Promise<RateLimitCheckResult>;

let webhookOverride: RateLimitFn | null = null;
let formOverride: RateLimitFn | null = null;

export function isRateLimitEnabled(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

export function setRateLimitOverrides(overrides: {
  webhook?: RateLimitFn | null;
  form?: RateLimitFn | null;
}): void {
  if ("webhook" in overrides) webhookOverride = overrides.webhook ?? null;
  if ("form" in overrides) formOverride = overrides.form ?? null;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

let webhookLimiter: Ratelimit | null = null;
let formLimiter: Ratelimit | null = null;

function getWebhookLimiter(): Ratelimit | null {
  if (webhookLimiter) return webhookLimiter;
  const redis = getRedis();
  if (!redis) return null;
  webhookLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(WEBHOOK_EVENTS_PER_DAY, "1 d"),
    prefix: "hookkit:wh",
  });
  return webhookLimiter;
}

function getFormLimiter(): Ratelimit | null {
  if (formLimiter) return formLimiter;
  const redis = getRedis();
  if (!redis) return null;
  formLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(FORM_SUBMISSIONS_PER_MONTH, "30 d"),
    prefix: "hookkit:frm",
  });
  return formLimiter;
}

export function retryAfterSeconds(reset?: number): number {
  if (!reset) return 60;
  const seconds = Math.ceil((reset - Date.now()) / 1000);
  return Math.max(1, seconds);
}

export async function checkWebhookRateLimit(
  inboxId: string,
  clientIp: string,
): Promise<RateLimitCheckResult> {
  if (webhookOverride) return webhookOverride(`${inboxId}:${clientIp}`);

  if (!isRateLimitEnabled()) return { success: true };

  const limiter = getWebhookLimiter();
  if (!limiter) return { success: true };

  const result = await limiter.limit(`${inboxId}:${clientIp}`);
  return { success: result.success, reset: result.reset };
}

export async function checkFormRateLimit(
  formId: string,
  clientIp: string,
): Promise<RateLimitCheckResult> {
  if (formOverride) return formOverride(`${formId}:${clientIp}`);

  if (!isRateLimitEnabled()) return { success: true };

  const limiter = getFormLimiter();
  if (!limiter) return { success: true };

  const result = await limiter.limit(`${formId}:${clientIp}`);
  return { success: result.success, reset: result.reset };
}

export async function getWebhookRateLimitUsage(
  inboxId: string,
  clientIp: string,
): Promise<RateLimitUsage> {
  const fallback: RateLimitUsage = {
    enabled: false,
    limit: WEBHOOK_EVENTS_PER_DAY,
    remaining: WEBHOOK_EVENTS_PER_DAY,
    used: 0,
    reset: null,
  };

  if (!isRateLimitEnabled()) return fallback;

  const limiter = getWebhookLimiter();
  if (!limiter) return fallback;

  const result = await limiter.getRemaining(`${inboxId}:${clientIp}`);
  return {
    enabled: true,
    limit: result.limit,
    remaining: result.remaining,
    used: Math.max(0, result.limit - result.remaining),
    reset: result.reset,
  };
}

export async function getFormRateLimitUsage(
  formId: string,
  clientIp: string,
): Promise<RateLimitUsage> {
  const fallback: RateLimitUsage = {
    enabled: false,
    limit: FORM_SUBMISSIONS_PER_MONTH,
    remaining: FORM_SUBMISSIONS_PER_MONTH,
    used: 0,
    reset: null,
  };

  if (!isRateLimitEnabled()) return fallback;

  const limiter = getFormLimiter();
  if (!limiter) return fallback;

  const result = await limiter.getRemaining(`${formId}:${clientIp}`);
  return {
    enabled: true,
    limit: result.limit,
    remaining: result.remaining,
    used: Math.max(0, result.limit - result.remaining),
    reset: result.reset,
  };
}
