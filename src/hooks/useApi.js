import { useState, useEffect, useCallback, useRef } from 'react';
import { apiMessage } from '../api/axios';

/**
 * Generic data-fetching hook.
 *
 * @param {Function} fetcher  async function returning the unwrapped payload
 * @param {Array}    deps     dependency array — refetches when these change
 * @param {Object}   options  { immediate?: boolean, initialData?: any }
 * @returns {{ data, loading, error, refetch, setData }}
 */
export function useFetch(fetcher, deps = [], options = {}) {
  const { immediate = true, initialData = null } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);

  // Keep the latest fetcher without retriggering the mount effect.
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
      return result;
    } catch (err) {
      setError(apiMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch, setData };
}

/**
 * Normalizes a list response that may be either a bare array or a Laravel
 * paginator object ({ data, current_page, last_page, total, ... }).
 */
export function asList(payload) {
  if (Array.isArray(payload)) return { rows: payload, meta: null };
  if (Array.isArray(payload?.data)) {
    const { data, ...meta } = payload;
    return { rows: data, meta };
  }
  return { rows: [], meta: null };
}
