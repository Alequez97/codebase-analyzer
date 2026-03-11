import client from "./client";

export const getTasks = (params = {}) => client.get("/tasks", { params });

export const getPendingTasks = () => client.get("/tasks/pending");

export const deleteTask = (id) => client.delete(`/tasks/${id}`);

export const getTaskLogs = (taskId) => client.get(`/tasks/${taskId}/logs`);

export const cancelTask = (id) => client.post(`/tasks/${id}/cancel`);

export const getTaskChatHistory = (taskId) =>
  client.get(`/tasks/${taskId}/chat-history`);

export const appendTaskChatMessage = (taskId, { role, content }) =>
  client.post(`/tasks/${taskId}/chat-history`, { role, content });

export const deleteTaskChatHistory = (taskId) =>
  client.delete(`/tasks/${taskId}/chat-history`);
