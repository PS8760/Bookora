/**
 * In-process slot cache with TTL and ETag support.
 *
 * Why in-process instead of Redis?
 * - No Redis dependency to add
 * - Next.js API routes run in the same Node process (single instance dev)
 * - TTL of 4 seconds means stale data is at most 4s old — acceptable for
 *   a booking system where the DB transaction is the true source of truth
 * - ETag support lets the browser skip parsing unchanged responses
 *
 * In production with multiple instances, each instance has its own cache.
 * The DB transaction (optimistic lock on `version`) is the authoritative
 * double-booking guard — the cache only reduces DB load.
 */

import { createHash } from "crypto";
import type { SlotResult } from "./slots";

interface CacheEntry {
  slots:     SlotResult[];
  etag:      string;
  expiresAt: number; // Date.now() ms
}

// serviceId:date → CacheEntry
const cache = new Map<string, CacheEntry>();

const TTL_MS = 4_000; // 4 seconds

function cacheKey(serviceId: string, date: string, resourceId?: string): string {
  return `${serviceId}:${date}${resourceId ? `:${resourceId}` : ""}`;
}

function computeETag(slots: SlotResult[]): string {
  // Hash the slot IDs + remaining capacities — changes whenever a booking is made
  const payload = slots.map((s) => `${s.id}:${s.remaining}:${s.version}`).join("|");
  return `"${createHash("sha1").update(payload).digest("hex").slice(0, 16)}"`;
}

export function getCachedSlots(
  serviceId: string,
  date: string,
  resourceId?: string
): { slots: SlotResult[]; etag: string } | null {
  const key = cacheKey(serviceId, date, resourceId);
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return { slots: entry.slots, etag: entry.etag };
}

export function setCachedSlots(
  serviceId: string,
  date: string,
  slots: SlotResult[],
  resourceId?: string
): string {
  const key  = cacheKey(serviceId, date, resourceId);
  const etag = computeETag(slots);
  cache.set(key, {
    slots,
    etag,
    expiresAt: Date.now() + TTL_MS,
  });
  return etag;
}

/**
 * Invalidate cache for a service on a specific date.
 * Called immediately after a booking is created or cancelled.
 */
export function invalidateSlotCache(serviceId: string, date: string): void {
  // Invalidate all resource variants for this service+date
  for (const key of cache.keys()) {
    if (key.startsWith(`${serviceId}:${date}`)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalidate all cache entries for a service.
 * Called when a service is published/unpublished or schedule changes.
 */
export function invalidateServiceCache(serviceId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${serviceId}:`)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalidate cache for a service on a computed date from a slot's startTime.
 * Convenience helper for cancel/reschedule routes that have the slot but not the date string.
 */
export function invalidateSlotCacheForSlot(serviceId: string, slotStartTime: Date): void {
  const date = slotStartTime.toISOString().slice(0, 10);
  invalidateSlotCache(serviceId, date);
}

// Periodic cleanup of expired entries to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) cache.delete(key);
    }
  }, 30_000);
}

