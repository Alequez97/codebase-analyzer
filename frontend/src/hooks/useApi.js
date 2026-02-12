import { useEffect, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import api from "../services/api";

export function useFetchStatus() {
  const { setStatus, setLoading, setError, autoSelectCodebase } = useAppStore();

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.getStatus();
      setStatus(response.data);
      autoSelectCodebase();
      setError(null);
      setLoading(false);
    } catch (err) {
      setError("Failed to connect to backend server");
      setLoading(false);
    }
  }, [setStatus, setLoading, setError, autoSelectCodebase]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { refetch: fetchStatus };
}

export function useFetchModules() {
  const { selectedCodebase, setModules } = useAppStore();

  const fetchModules = useCallback(async () => {
    if (!selectedCodebase) return;

    try {
      const response = await api.getModules(selectedCodebase.id);
      setModules(response.data.modules || []);
    } catch (err) {
      console.log("No modules found yet");
      setModules([]);
    }
  }, [selectedCodebase, setModules]);

  useEffect(() => {
    if (selectedCodebase) {
      fetchModules();
    }
  }, [selectedCodebase, fetchModules]);

  return { refetch: fetchModules };
}

export function useAnalyzeCodebase() {
  const { selectedCodebase, setAnalyzingCodebase, setModules, setError } =
    useAppStore();

  const startCodebaseAnalysis = useCallback(async () => {
    if (!selectedCodebase) return;

    setAnalyzingCodebase(true);
    try {
      await api.requestCodebaseAnalysis(selectedCodebase.id, true);

      // Poll for results
      const pollInterval = setInterval(async () => {
        try {
          const response = await api.getModules(selectedCodebase.id);
          if (response.data.modules && response.data.modules.length > 0) {
            setModules(response.data.modules);
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
  }, [selectedCodebase, setAnalyzingCodebase, setModules, setError]);

  return { startCodebaseAnalysis };
}
