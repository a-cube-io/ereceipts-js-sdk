/**
 * Timeout Helper Utilities
 * Cross-platform timeout handling for Node.js and browser environments
 */

/**
 * Cross-platform setTimeout that returns NodeJS.Timeout
 */
export function setTimeoutSafe(callback: () => void, delay: number): NodeJS.Timeout {
  return setTimeout(callback, delay) as unknown as NodeJS.Timeout;
}

/**
 * Cross-platform setInterval that returns NodeJS.Timeout
 */
export function setIntervalSafe(callback: () => void, delay: number): NodeJS.Timeout {
  return setInterval(callback, delay) as unknown as NodeJS.Timeout;
}

/**
 * Safe clearTimeout that accepts both number and NodeJS.Timeout
 */
export function clearTimeoutSafe(timeout: NodeJS.Timeout | number | null | undefined): void {
  if (timeout != null) {
    clearTimeout(timeout as NodeJS.Timeout);
  }
}

/**
 * Safe clearInterval that accepts both number and NodeJS.Timeout
 */
export function clearIntervalSafe(interval: NodeJS.Timeout | number | null | undefined): void {
  if (interval != null) {
    clearInterval(interval as NodeJS.Timeout);
  }
}
