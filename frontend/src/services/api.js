import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
});

export default {
  // Status
  getStatus: () => api.get("/status"),

  // Full Codebase Analysis
  getCodebaseAnalysis: () => api.get("/analysis/codebase"),
  requestCodebaseAnalysis: (executeNow = true) =>
    api.post("/analysis/codebase/request", { executeNow }),

  // Full Codebase Analysis - Full results and modules
  getFullCodebaseAnalysis: () => api.get("/analysis/codebase/full"),
  getModule: (id) => api.get(`/analysis/module/${id}`),
  analyzeModule: (id, moduleName, files, executeNow = true) =>
    api.post(`/analysis/module/${id}/analyze`, {
      moduleName,
      files,
      executeNow,
    }),

  // Tasks
  getPendingTasks: () => api.get("/tasks/pending"),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
};
