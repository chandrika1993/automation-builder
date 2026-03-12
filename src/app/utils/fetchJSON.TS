
/**
 * Thin wrapper around `fetch` that:
 *  - Reads the response as text first (avoids JSON.parse throwing on empty bodies)
 *  - Returns a discriminated union: `{ ok: true, data }` | `{ ok: false, error }`
 *  - Catches network errors (DNS failure, CORS, offline) and surfaces them uniformly
 *
 * All API calls in this file go through fetchJSON so error handling is consistent.
 */
export async function fetchJSON<T = any>(
    url: string,
    options?: RequestInit
  ): Promise<
    { ok: true; data: T } | { ok: false; status: number; error: string }
  > {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
  
      if (!text?.trim()) {
        return { ok: false, status: res.status, error: "Empty response body" };
      }
  
      let data: T;
      try {
        data = JSON.parse(text);
      } catch {
        return { ok: false, status: res.status, error: "Invalid JSON response" };
      }
  
      if (!res.ok) {
        const message =
          (data as any)?.error ?? res.statusText ?? "Request failed";
        return { ok: false, status: res.status, error: message };
      }
  
      return { ok: true, data };
    } catch (err) {
      // Network error, DNS failure, CORS, etc.
      return {
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }