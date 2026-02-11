import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

export default {
  // Status
  getStatus: () => api.get('/status'),
  
  // Scan
  getScan: () => api.get('/scan'),
  requestScan: (executeNow = true) => api.post('/scan/request', { executeNow }),
  
  // Modules
  getModules: () => api.get('/modules'),
  getModule: (id) => api.get(`/modules/${id}`),
  analyzeModule: (id, moduleName, files, executeNow = true) => 
    api.post(`/modules/${id}/analyze`, { moduleName, files, executeNow }),
  
  // Tasks
  getPendingTasks: () => api.get('/tasks/pending'),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
};
