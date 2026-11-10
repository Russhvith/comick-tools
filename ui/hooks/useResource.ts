// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Entry<T> = { data?: T; error?: Error; updatedAt: number; inflight?: Promise<void> };

// One cache for the whole page, so two components reading the same URL
// share a single request and see the same data.
const cache = new Map<string, Entry<unknown>>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

function write<T>(key: string, patch: Partial<Entry<T>>) {
  const prev = (cache.get(key) as Entry<T>) ?? { updatedAt: 0 };
  cache.set(key, { ...prev, ...patch });
  notify(key);
}

export function mutateResource<T>(key: string, data: T | ((prev: T | undefined) => T)) {
  const prev = cache.get(key)?.data as T | undefined;
  const next = typeof data === "function" ? (data as (p: T | undefined) => T)(prev) : data;
  write<T>(key, { data: next, updatedAt: Date.now() });
}

type Options<T> = {
  /**
   * Background refresh interval in ms, or a function of the current data
   * that returns one (undefined or 0 means don't poll). Omit to only fetch
   * on mount.
   */
  interval?: number | ((data: T | undefined) => number | undefined);
  /** Refresh when the tab becomes visible or the window regains focus. */
  revalidateOnFocus?: boolean;
  /** Server rendered data, shown right away and treated as fresh. */
  initial?: T;
};

/**
 * Stale-while-revalidate: show whatever we last had for this key, refresh
 * in the background, and swap in the new data when it lands. A failed
 * refresh keeps the old data on screen alongside the error.
 */
export function useResource<T>(key: string | null, fetcher: () => Promise<T>, options: Options<T> = {}) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // The module cache would outlive a single request on the server and
  // hand one visitor's data to the next, so it's browser only.
  const onServer = typeof window === "undefined";
  if (!onServer && key && options.initial !== undefined && !cache.has(key)) {
    cache.set(key, { data: options.initial, updatedAt: Date.now() });
  }
  const serverEntry = options.initial !== undefined ? ({ data: options.initial, updatedAt: 0 } as Entry<T>) : undefined;

  const subscribe = useCallback(
    (fn: () => void) => {
      if (!key) return () => {};
      const set = listeners.get(key) ?? new Set();
      set.add(fn);
      listeners.set(key, set);
      return () => set.delete(fn);
    },
    [key],
  );
  const entry = useSyncExternalStore(
    subscribe,
    () => (key ? (cache.get(key) as Entry<T> | undefined) : undefined),
    () => (key ? serverEntry : undefined),
  );
  const [validating, setValidating] = useState(false);

  const revalidate = useCallback(async () => {
    if (!key) return;
    const current = cache.get(key);
    if (current?.inflight) return current.inflight;
    setValidating(true);
    const inflight = fetcherRef
      .current()
      .then((data) => write<T>(key, { data, error: undefined, updatedAt: Date.now(), inflight: undefined }))
      .catch((error: Error) => write<T>(key, { error, inflight: undefined }))
      .finally(() => setValidating(false));
    write<T>(key, { inflight });
    return inflight;
  }, [key]);

  // Resolved on every render so a function can turn polling on and off as
  // the data changes (poll while something is running, stop when it isn't).
  const wait = typeof options.interval === "function" ? options.interval(entry?.data) : options.interval;

  useEffect(() => {
    if (!key) return;
    if (options.initial === undefined || Date.now() - (cache.get(key)?.updatedAt ?? 0) > 2000) void revalidate();
    // options.initial is left out on purpose, it only matters on first render.
  }, [key, revalidate]);

  useEffect(() => {
    if (!key || !wait) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void revalidate();
    }, wait);
    return () => clearInterval(timer);
  }, [key, wait, revalidate]);

  // Coming back to the tab is when stale data matters, so refresh then
  // instead of polling in the background.
  useEffect(() => {
    if (!key || !options.revalidateOnFocus) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void revalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [key, options.revalidateOnFocus, revalidate]);

  return {
    data: entry?.data,
    error: entry?.error,
    loading: entry?.data === undefined && !entry?.error,
    validating,
    revalidate,
  };
}
