import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class UploadsRateLimitService {
  private readonly fallbackAttempts = new Map<string, number[]>();

  private readonly FALLBACK_LIMIT_PER_WINDOW = 20;
  private readonly WINDOW_MS = 60 * 1000;
  private readonly MAX_TRACKED_KEYS = 5000;

  private prune(now: number): void {
    if (this.fallbackAttempts.size < this.MAX_TRACKED_KEYS) {
      return;
    }
    for (const [key, timestamps] of this.fallbackAttempts) {
      const latest = timestamps[timestamps.length - 1] ?? 0;
      if (now - latest >= this.WINDOW_MS) {
        this.fallbackAttempts.delete(key);
      }
    }
    while (this.fallbackAttempts.size >= this.MAX_TRACKED_KEYS) {
      const oldestKey = this.fallbackAttempts.keys().next().value;
      if (oldestKey === undefined) break;
      this.fallbackAttempts.delete(oldestKey);
    }
  }

  assertFallbackUploadAllowed(key: string): void {
    const cleanKey = key.trim() || 'anonymous';
    const now = Date.now();
    this.prune(now);

    const history = this.fallbackAttempts.get(cleanKey) ?? [];
    const recent = history.filter((ts) => now - ts < this.WINDOW_MS);

    if (recent.length >= this.FALLBACK_LIMIT_PER_WINDOW) {
      const oldestRecent = recent[0] ?? now;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((this.WINDOW_MS - (now - oldestRecent)) / 1000),
      );
      throw new HttpException(
        {
          message: `Has alcanzado el límite temporal de subidas directas al servidor. Intenta nuevamente en ${retryAfterSeconds}s.`,
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.fallbackAttempts.set(cleanKey, recent);
  }
}
