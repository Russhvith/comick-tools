// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 Russhvith

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** fetch + JSON, turning the API's `{ error }` bodies into thrown errors. */
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(body.error || `Server answered ${res.status}`, res.status);
  return body as T;
}
