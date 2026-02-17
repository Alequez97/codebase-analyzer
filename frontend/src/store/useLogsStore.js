import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "../services/api";

/**
 * Store for UI state and data related to logs display
 */
export const useLogsStore = create(
  persist(
    (set, get) => ({
      // State
      showDashboardLogs: false, // Dashboard: toggles between modules and full codebase logs
      showDomainLogs: false, // Domain details: toggles between analysis and domain-specific logs
      // Logs storage by domain and section type (Map<domainId, Map<sectionType, string>>)
      domainLogsBySection: new Map(),
      // Loading state for logs fetch (Map<domainId, Map<sectionType, boolean>>)
      logsLoadingBySection: new Map(),
      // Codebase analysis logs (real-time from socket)
      codebaseAnalysisLogs: [],

      // Actions
      toggleDashboardLogs: () =>
        set((state) => ({ showDashboardLogs: !state.showDashboardLogs })),
      toggleDomainLogs: () =>
        set((state) => ({ showDomainLogs: !state.showDomainLogs })),

      /**
       * Append logs to a specific domain section
       * @param {string} domainId - Domain identifier
       * @param {string} sectionType - Section type (documentation, requirements, testing)
       * @param {string} logText - Log text to append
       */
      appendLogs: (domainId, sectionType, logText) =>
        set((state) => {
          const domainLogs =
            state.domainLogsBySection.get(domainId) || new Map();
          const currentLogs = domainLogs.get(sectionType) || "";
          domainLogs.set(sectionType, currentLogs + logText);

          const newDomainLogsBySection = new Map(state.domainLogsBySection);
          newDomainLogsBySection.set(domainId, domainLogs);

          return { domainLogsBySection: newDomainLogsBySection };
        }),

      /**
       * Set logs for a specific domain section (replaces existing)
       * @param {string} domainId - Domain identifier
       * @param {string} sectionType - Section type
       * @param {string} logText - Complete log text
       */
      setLogs: (domainId, sectionType, logText) =>
        set((state) => {
          const domainLogs =
            state.domainLogsBySection.get(domainId) || new Map();
          domainLogs.set(sectionType, logText);

          const newDomainLogsBySection = new Map(state.domainLogsBySection);
          newDomainLogsBySection.set(domainId, domainLogs);

          return { domainLogsBySection: newDomainLogsBySection };
        }),

      /**
       * Fetch task logs from API
       * @param {string} domainId - Domain identifier
       * @param {string} taskId - Task identifier
       * @param {string} sectionType - Section type
       */
      fetchTaskLogs: async (domainId, taskId, sectionType) => {
        // Set loading state
        set((state) => {
          const loadingMap =
            state.logsLoadingBySection.get(domainId) || new Map();
          loadingMap.set(sectionType, true);

          const newLogsLoadingBySection = new Map(state.logsLoadingBySection);
          newLogsLoadingBySection.set(domainId, loadingMap);

          return { logsLoadingBySection: newLogsLoadingBySection };
        });

        try {
          const response = await api.getTaskLogs(taskId);

          // Set logs
          get().setLogs(domainId, sectionType, response.content || "");
        } catch (error) {
          console.error(`Failed to fetch logs for task ${taskId}:`, error);
          get().setLogs(
            domainId,
            sectionType,
            `Error loading logs: ${error.message}`,
          );
        } finally {
          // Clear loading state
          set((state) => {
            const loadingMap =
              state.logsLoadingBySection.get(domainId) || new Map();
            loadingMap.set(sectionType, false);

            const newLogsLoadingBySection = new Map(state.logsLoadingBySection);
            newLogsLoadingBySection.set(domainId, loadingMap);

            return { logsLoadingBySection: newLogsLoadingBySection };
          });
        }
      },

      /**
       * Clear logs for a specific domain section
       * @param {string} domainId - Domain identifier
       * @param {string} sectionType - Section type (optional, clears all if not specified)
       */
      clearLogs: (domainId, sectionType = null) =>
        set((state) => {
          const newDomainLogsBySection = new Map(state.domainLogsBySection);

          if (sectionType) {
            // Clear specific section
            const domainLogs = newDomainLogsBySection.get(domainId);
            if (domainLogs) {
              domainLogs.delete(sectionType);
              if (domainLogs.size === 0) {
                newDomainLogsBySection.delete(domainId);
              }
            }
          } else {
            // Clear all sections for domain
            newDomainLogsBySection.delete(domainId);
          }

          return { domainLogsBySection: newDomainLogsBySection };
        }),

      /**
       * Add a log entry to codebase analysis logs (from socket events)
       * @param {Object} logEntry - Log entry object
       */
      addCodebaseAnalysisLog: (logEntry) =>
        set((state) => ({
          codebaseAnalysisLogs: [...state.codebaseAnalysisLogs, logEntry],
        })),

      /**
       * Clear all codebase analysis logs
       */
      clearCodebaseAnalysisLogs: () => set({ codebaseAnalysisLogs: [] }),

      reset: () =>
        set({
          showDashboardLogs: false,
          showDomainLogs: false,
          domainLogsBySection: new Map(),
          logsLoadingBySection: new Map(),
          codebaseAnalysisLogs: [],
        }),
    }),
    {
      name: "logs-store",
      storage: createJSONStorage(() => sessionStorage, {
        replacer: (_key, value) => {
          if (value instanceof Map) {
            return { __type: "Map", value: Array.from(value.entries()) };
          }
          return value;
        },
        reviver: (_key, value) => {
          if (value && value.__type === "Map") {
            return new Map(value.value);
          }
          return value;
        },
      }),
      partialize: (state) => ({
        showDashboardLogs: state.showDashboardLogs,
        showDomainLogs: state.showDomainLogs,
        domainLogsBySection: state.domainLogsBySection,
        // Don't persist codebaseAnalysisLogs - they're session-specific
      }),
    },
  ),
);
