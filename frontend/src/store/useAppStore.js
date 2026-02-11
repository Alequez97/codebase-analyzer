import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // State
  status: null,
  modules: [],
  selectedCodebase: null,
  scanning: false,
  loading: true,
  error: null,

  // Actions
  setStatus: (status) => set({ status }),
  
  setModules: (modules) => set({ modules }),
  
  setSelectedCodebase: (codebase) => set({ selectedCodebase: codebase }),
  
  setScanning: (scanning) => set({ scanning }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
  
  // Auto-select first codebase
  autoSelectCodebase: () => {
    const { status, selectedCodebase } = get();
    if (status?.config?.codebases?.length > 0 && !selectedCodebase) {
      set({ selectedCodebase: status.config.codebases[0] });
    }
  },
  
  reset: () => set({
    status: null,
    modules: [],
    selectedCodebase: null,
    scanning: false,
    loading: true,
    error: null,
  }),
}));
