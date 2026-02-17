import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
});

export default {
  // Status
  getStatus: () => api.get("/status"),

  // Project Files
  getProjectFiles: () => api.get("/project/files"),

  // Full Codebase Analysis
  getCodebaseAnalysis: () => api.get("/analysis/codebase"),
  requestCodebaseAnalysis: (executeNow = true, agent = "llm-api") =>
    api.post("/analysis/codebase/request", { executeNow, agent }),

  // Full Codebase Analysis - Full results and modules
  getFullCodebaseAnalysis: () => api.get("/analysis/codebase/full"),
  getDomain: (id) => api.get(`/analysis/domain/${id}`),
  getDomainFiles: (id) => api.get(`/analysis/domain/${id}/files`),
  analyzeDomain: (id, domainName, files, executeNow = true, agent = "aider") =>
    api.post(`/analysis/domain/${id}/analyze`, {
      domainName,
      files,
      executeNow,
      agent,
    }),

  // Domain section-specific endpoints
  getDomainDocumentation: (id) =>
    api.get(`/analysis/domain/${id}/documentation`),
  getDomainRequirements: (id) => api.get(`/analysis/domain/${id}/requirements`),
  getDomainTesting: (id) => api.get(`/analysis/domain/${id}/testing`),

  analyzeDomainDocumentation: (id, domainName, files, executeNow = true) =>
    api.post(`/analysis/domain/${id}/analyze/documentation`, {
      domainName,
      files,
      executeNow,
    }),

  analyzeDomainRequirements: (id, domainName, files, executeNow = true) =>
    api.post(`/analysis/domain/${id}/analyze/requirements`, {
      domainName,
      files,
      executeNow,
    }),

  analyzeDomainTesting: (id, domainName, files, executeNow = true) =>
    api.post(`/analysis/domain/${id}/analyze/testing`, {
      domainName,
      files,
      executeNow,
    }),

  saveDocumentation: (id, documentation) =>
    api.post(`/analysis/domain/${id}/documentation/save`, {
      documentation,
    }),

  saveRequirements: (id, domainName, requirements) =>
    api.post(`/analysis/domain/${id}/requirements/save`, {
      domainName,
      requirements,
    }),

  saveDomainFiles: (id, files) =>
    api.post(`/analysis/domain/${id}/files/save`, {
      files,
    }),

  applyTest: (domainId, testId) =>
    api.post(`/analysis/domain/${domainId}/tests/${testId}/apply`),

  // Tasks
  getPendingTasks: () => api.get("/tasks/pending"),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
};
