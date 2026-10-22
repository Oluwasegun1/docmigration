import "server-only";
import { AppError } from "@/lib/errors";

export type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type HitRecord = {
  count: number;
  resetAt: number;
};

export interface RateLimiter {
  check(key: string, config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number; resetAt: number }>;
  assertAllowed(key: string, config: RateLimitConfig): Promise<void>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, HitRecord>();

  async check(key: string, config: RateLimitConfig) {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || record.resetAt <= now) {
      const newRecord: HitRecord = { count: 1, resetAt: now + config.windowMs };
      this.store.set(key, newRecord);
      return { allowed: true, remaining: config.maxRequests - 1, resetAt: newRecord.resetAt };
    }

    if (record.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: record.resetAt };
    }

    record.count += 1;
    return { allowed: true, remaining: config.maxRequests - record.count, resetAt: record.resetAt };
  }

  async assertAllowed(key: string, config: RateLimitConfig) {
    const res = await this.check(key, config);
    if (!res.allowed) {
      throw new AppError("rate_limited", "Too many requests. Please try again shortly.");
    }
  }

  clear() {
    this.store.clear();
  }
}

/** Global in-process rate limiter (suitable for serverless warm instances & unit tests) */
export const rateLimiter: RateLimiter = new InMemoryRateLimiter();
