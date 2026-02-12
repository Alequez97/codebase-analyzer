import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
});

export default {
  // Status
  getStatus: () => api.get("/status"),

  // Scan
  getScan: () => api.get("/analysis/scan"),
  requestScan: (executeNow = true) =>
    api.post("/analysis/scan/request", { executeNow }),

  // Scan - Full results and modules
  getModules: () => api.get("/analysis/scan/full"),
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
