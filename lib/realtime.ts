"use client";

export const LIVE_REFRESH_MS = 5000;
export const REPORT_REFRESH_MS = 10000;

export async function jsonFetcher<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();

  if (!response.ok) {
    const message =
      payload?.error?.message ?? payload?.message ?? "Failed to load data";
    throw new Error(message);
  }

  return payload;
}
