import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getE2EConfig, saveE2EConfig } from "../api/e2e-config";
import { toaster } from "../components/ui/toaster";

const DEFAULTS = {
  baseUrl: "http://localhost:5173",
  auth: { username: "", password: "" },
};

export const useE2EConfigStore = create(
  persist(
    (set, get) => ({
      // State
      config: DEFAULTS,
      loading: false,
      saving: false,

      // Actions
      fetchConfig: async () => {
        set({ loading: true });
        try {
          const response = await getE2EConfig();
          set({ config: response.data, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      saveConfig: async (data) => {
        set({ saving: true });
        try {
          const response = await saveE2EConfig(data);
          set({ config: response.data, saving: false });
          toaster.create({ title: "E2E configuration saved", type: "success" });
        } catch (err) {
          set({ saving: false });
          toaster.create({
            title: "Failed to save E2E configuration",
            description: err.message,
            type: "error",
          });
        }
      },

      setConfig: (config) => set({ config }),
    }),
    {
      name: "e2e-config-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ config: state.config }),
    },
  ),
);
