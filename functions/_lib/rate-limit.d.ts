export declare function getClientIp(request: Request): string;

export declare function getDeepScanRateLimitState(
  request: Request,
  env?: { RATE_LIMITS?: { get(key: string): Promise<string | null> } },
  scope?: string,
): Promise<{
  ip: string;
  key: string;
  used: number;
  remaining: number;
  limit: number;
  resetAt: string;
  allowed: boolean;
}>;

export declare function consumeDeepScanRateLimit(
  request: Request,
  env?: { RATE_LIMITS?: { get(key: string): Promise<string | null>; put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> } },
  scope?: string,
): Promise<{
  ip: string;
  key: string;
  used: number;
  remaining: number;
  limit: number;
  resetAt: string;
  allowed: boolean;
}>;

export declare const DEFAULT_DEEP_SCAN_DAILY_LIMIT: number;
