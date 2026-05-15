import { useState, useEffect } from "react";
import { logDevError } from "./utils";

/**
 * useFetch — fires `fn` on mount (and when deps change), manages loading/error/data.
 * Returns `setData` so callers can apply optimistic updates without a full re-fetch.
 * Only suitable for data that is fetched once per mount; for mutations use local state.
 */
export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) { logDevError("useFetch", e); setError(e.message); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, setData };
}

/**
 * useDebouncedSearch — returns a raw search string, its setter, and a debounced copy.
 * The debounced value is the raw input without normalisation; trim/lowercase at use-site.
 */
export function useDebouncedSearch(delayMs = 200) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), delayMs);
    return () => clearTimeout(id);
  }, [search, delayMs]);

  return { search, setSearch, debouncedSearch };
}
