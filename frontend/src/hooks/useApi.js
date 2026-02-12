import { useEffect, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import api from "../services/api";

export function useFetchStatus() {
  const { setStatus, setLoading, setError } = useAppStore();

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.getStatus();
      setStatus(response.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError("Failed to connect to backend server");
      setLoading(false);
    }
  }, [setStatus, setLoading, setError]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { refetch: fetchStatus };
}

export function useFetchAnalysis() {
  const { setAnalysis } = useAppStore();

  const fetchAnalysis = useCallback(async () => {
    try {
      const response = await api.getFullCodebaseAnalysis();
      setAnalysis(response.data);
    } catch (err) {
      console.log("No analysis found yet");
      setAnalysis(null);
    }
  }, [setAnalysis]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return { refetch: fetchAnalysis };
}

export function useAnalyzeCodebase() {
  const { setAnalyzingCodebase, setAnalysis, setError } = useAppStore();

  const startCodebaseAnalysis = useCallback(async () => {
    setAnalyzingCodebase(true);
    try {
      await api.requestCodebaseAnalysis(true);

      // Poll for results
      const pollInterval = setInterval(async () => {
        try {
          const response = await api.getFullCodebaseAnalysis();
          if (response.data.domains && response.data.domains.length > 0) {
            setAnalysis(response.data);
            setAnalyzingCodebase(false);
            clearInterval(pollInterval);
          }
        } catch (err) {
          // Still waiting
        }
      }, 3000);

      // Stop after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setAnalyzingCodebase(false);
      }, 120000);
    } catch (err) {
      setError("Failed to start codebase analysis");
      setAnalyzingCodebase(false);
    }
  }, [setAnalyzingCodebase, setAnalysis, setError]);

  return { startCodebaseAnalysis };
}
