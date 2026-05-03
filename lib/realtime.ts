"use client";

/**
 * Real-time polling configuration and utilities.
 *
 * Strategy: Smart polling with SWR
 * - Slots page: 4s interval (matches server cache TTL)
 * - Dashboards: 8s interval
 * - Reports: 30s interval
 * - Pauses automatically when tab is hidden (visibilitychange)
 * - SWR deduplicates concurrent requests from multiple components
 * - ETag support: browser sends If-None-Match, server returns 304 when unchanged
 */

// ─── Intervals ────────────────────────────────────────────────────────────────

/** Slot availability — matches server-side cache TTL */
export const SLOT_REFRESH_MS = 4_000;

/** Dashboard stats */
export const LIVE_REFRESH_MS = 8_000;

/** Reports / analytics */
export const REPORT_REFRESH_MS = 30_000;

// ─── SWR config presets ───────────────────────────────────────────────────────

/** Use for slot availability polling on the booking page */
export const slotSWRConfig = {
  refreshInterval:    SLOT_REFRESH_MS,
  revalidateOnFocus:  true,
  revalidateOnReconnect: true,
  dedupingInterval:   1_000,
  // Pause polling when tab is hidden — saves bandwidth and DB load
  refreshWhenHidden:  false,
  refreshWhenOffline: false,
} as const;

/** Use for dashboard widgets */
export const dashboardSWRConfig = {
  refreshInterval:    LIVE_REFRESH_MS,
  revalidateOnFocus:  true,
  revalidateOnReconnect: true,
  dedupingInterval:   2_000,
  refreshWhenHidden:  false,
  refreshWhenOffline: false,
} as const;

/** Use for report pages */
export const reportSWRConfig = {
  refreshInterval:    REPORT_REFRESH_MS,
  revalidateOnFocus:  true,
  revalidateOnReconnect: true,
  dedupingInterval:   5_000,
  refreshWhenHidden:  false,
  refreshWhenOffline: false,
} as const;

// ─── Fetchers ─────────────────────────────────────────────────────────────────

/**
 * Standard JSON fetcher for SWR.
 * Throws on non-2xx responses so SWR can handle error state.
 */
export async function jsonFetcher<T = any>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload  = await response.json();

  if (!response.ok) {
    const message =
      payload?.error?.message ?? payload?.message ?? "Failed to load data";
    throw new Error(message);
  }

  return payload;
}

/**
 * ETag-aware fetcher for slot availability.
 *
 * Sends If-None-Match header with the last known ETag.
 * On 304 Not Modified, returns the previously cached data unchanged —
 * SWR will not trigger a re-render since the data reference is the same.
 *
 * Usage:
 *   const { data } = useSWR(url, etagFetcher, slotSWRConfig);
 *
 * The ETag is stored in a module-level Map keyed by URL.
 */
const etagStore = new Map<string, { etag: string; data: unknown }>();

export async function etagFetcher<T = any>(url: string): Promise<T> {
  const cached = etagStore.get(url);

  const headers: HeadersInit = { "Cache-Control": "no-cache" };
  if (cached?.etag) {
    headers["If-None-Match"] = cached.etag;
  }

  const response = await fetch(url, { headers, cache: "no-store" });

  // 304 Not Modified — return cached data, no re-render
  if (response.status === 304 && cached) {
    return cached.data as T;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error?.message ?? "Failed to load data";
    throw new Error(message);
  }

  const data = await response.json() as T;
  const etag = response.headers.get("ETag");
  if (etag) {
    etagStore.set(url, { etag, data });
  }

  return data;
}

/**
 * Clear the ETag cache for a URL.
 * Call this after a booking is created to force a fresh fetch on the next poll.
 */
export function clearETagCache(url: string): void {
  etagStore.delete(url);
}
