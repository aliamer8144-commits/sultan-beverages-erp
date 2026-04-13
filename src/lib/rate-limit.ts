/**
 * In-Memory Rate Limiter — Sultan Beverages ERP
 *
 * Sliding window rate limiter using a Map<string, Count[]>.
 * No external dependencies — suitable for single-server deployments.
 *
 * ⚠️ Server-side only — never import this file in client components.
 */

// ── Types ──────────────────────────────────────────────────────────

interface Attempt {
  timestamp: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

interface RateLimitConfig {
  /** Maximum number of attempts within the window */
  maxAttempts: number
  /** Window duration in milliseconds */
  windowMs: number
}

// ── Storage ────────────────────────────────────────────────────────

const store = new Map<string, Attempt[]>()

// Cleanup stale entries every 5 minutes to prevent memory leaks
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, attempts] of store) {
      const filtered = attempts.filter((a) => now - a.timestamp < 600_000)
      if (filtered.length === 0) {
        store.delete(key)
      } else {
        store.set(key, filtered)
      }
    }
  }, 300_000)
}

// ── Core Function ──────────────────────────────────────────────────

/**
 * Check if a request is within rate limits.
 *
 * @param key - Unique identifier (e.g., IP address, username, or IP+endpoint)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 *
 * @example
 * ```ts
 * const { success, remaining } = checkRateLimit('192.168.1.1:login', {
 *   maxAttempts: 5,
 *   windowMs: 60_000, // 1 minute
 * })
 * if (!success) {
 *   return errorResponse('محاولات كثيرة — يرجى الانتظار', 429)
 * }
 * ```
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  ensureCleanup()

  const now = Date.now()
  const windowStart = now - config.windowMs

  let attempts = store.get(key)

  if (!attempts) {
    attempts = []
    store.set(key, attempts)
  }

  // Remove attempts outside the current window
  const recentAttempts = attempts.filter((a) => a.timestamp > windowStart)
  store.set(key, recentAttempts)

  if (recentAttempts.length >= config.maxAttempts) {
    // Find when the oldest attempt in the window expires
    const oldestInWindow = recentAttempts[0].timestamp
    return {
      success: false,
      remaining: 0,
      resetAt: oldestInWindow + config.windowMs,
    }
  }

  // Record this attempt
  recentAttempts.push({ timestamp: now })

  return {
    success: true,
    remaining: config.maxAttempts - recentAttempts.length,
    resetAt: windowStart + config.windowMs,
  }
}

/**
 * Record a failed attempt (used for login brute-force protection).
 * Only failed attempts are counted — successful logins are not recorded.
 */
export function recordFailedAttempt(key: string) {
  ensureCleanup()
  const now = Date.now()
  let attempts = store.get(key)
  if (!attempts) {
    attempts = []
    store.set(key, attempts)
  }
  attempts.push({ timestamp: now })
}

/**
 * Check rate limit without recording an attempt.
 * Used to verify if a key has exceeded limits before allowing the request.
 */
export function checkRateLimitOnly(key: string, config: RateLimitConfig): RateLimitResult {
  ensureCleanup()
  const now = Date.now()
  const windowStart = now - config.windowMs

  let attempts = store.get(key)
  if (!attempts) {
    return { success: true, remaining: config.maxAttempts, resetAt: now + config.windowMs }
  }

  const recentAttempts = attempts.filter((a) => a.timestamp > windowStart)

  if (recentAttempts.length >= config.maxAttempts) {
    const oldestInWindow = recentAttempts[0].timestamp
    return {
      success: false,
      remaining: 0,
      resetAt: oldestInWindow + config.windowMs,
    }
  }

  return {
    success: true,
    remaining: config.maxAttempts - recentAttempts.length,
    resetAt: windowStart + config.windowMs,
  }
}

// ── Preset Configs ─────────────────────────────────────────────────

/** Login: 20 attempts per minute per IP */
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 20,
  windowMs: 60_000,
}

/** Login: 60 attempts per 5 minutes per IP (backup window) */
export const LOGIN_RATE_LIMIT_SLOW: RateLimitConfig = {
  maxAttempts: 60,
  windowMs: 300_000,
}
