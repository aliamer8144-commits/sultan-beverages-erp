/**
 * In-Memory Rate Limiter with File Persistence — Sultan Beverages ERP
 *
 * Sliding window rate limiter using a Map<string, Attempt[]>.
 * Includes file-based persistence so rate limits survive serverless
 * cold starts and process restarts.
 *
 * ⚠️ Server-side only — never import this file in client components.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

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

const RATE_LIMIT_FILE = join('/tmp', 'sultan-erp-rate-limit.json')

// In-memory store (always used for fast access)
const store = new Map<string, Attempt[]>()

// Track if we've loaded from file
let loadedFromFile = false
let lastWriteTime = 0
const WRITE_INTERVAL = 10_000 // Write to file at most every 10 seconds

// ── Persistence ────────────────────────────────────────────────────

/** Load persisted data on first access (lazy — called by each public function) */
function loadFromFile() {
  if (loadedFromFile) return
  loadedFromFile = true
  try {
    if (existsSync(RATE_LIMIT_FILE)) {
      const data = JSON.parse(readFileSync(RATE_LIMIT_FILE, 'utf-8'))
      const now = Date.now()
      for (const [key, attempts] of Object.entries(data)) {
        // Only load recent attempts (within the last 10 minutes)
        const recent = (attempts as Attempt[]).filter((a: Attempt) => now - a.timestamp < 600_000)
        if (recent.length > 0) {
          store.set(key, recent)
        }
      }
    }
  } catch {
    // Ignore file read errors — fall back to empty store
  }
}

/** Debounced write — only persists to file if enough time has elapsed */
function debouncedWrite() {
  const now = Date.now()
  if (now - lastWriteTime < WRITE_INTERVAL) return
  lastWriteTime = now
  try {
    const data: Record<string, Attempt[]> = {}
    for (const [key, attempts] of store) {
      data[key] = attempts
    }
    writeFileSync(RATE_LIMIT_FILE, JSON.stringify(data))
  } catch {
    // Ignore write errors
  }
}

// ── Cleanup ────────────────────────────────────────────────────────

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
    // Also persist after cleanup
    debouncedWrite()
  }, 300_000)
}

// ── Core Functions ─────────────────────────────────────────────────

/**
 * Check if a request is within rate limits and record the attempt.
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
  loadFromFile()
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
    debouncedWrite()
    return {
      success: false,
      remaining: 0,
      resetAt: oldestInWindow + config.windowMs,
    }
  }

  // Record this attempt
  recentAttempts.push({ timestamp: now })
  debouncedWrite()

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
  loadFromFile()
  ensureCleanup()
  const now = Date.now()
  let attempts = store.get(key)
  if (!attempts) {
    attempts = []
    store.set(key, attempts)
  }
  attempts.push({ timestamp: now })
  debouncedWrite()
}

/**
 * Check rate limit without recording an attempt.
 * Used to verify if a key has exceeded limits before allowing the request.
 */
export function checkRateLimitOnly(key: string, config: RateLimitConfig): RateLimitResult {
  loadFromFile()
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
