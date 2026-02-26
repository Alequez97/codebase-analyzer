import { useState, useEffect, useRef } from "react";

/**
 * Hook for polling data at regular intervals
 * @param {Function} fetchFn - Function to fetch data
 * @param {number} interval - Polling interval in ms
 * @param {boolean} enabled - Whether polling is enabled
 */
export function usePolling(fetchFn, interval = 3000, enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetch = async () => {
    try {
      const result = await fetchFn();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Fetch immediately
    fetch();

    // Then poll
    if (interval > 0) {
      intervalRef.current = setInterval(fetch, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval]);

  return { data, loading, error, refetch: fetch };
}
