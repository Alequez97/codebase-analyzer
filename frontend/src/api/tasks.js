import client from "./client";

export const getPendingTasks = () => client.get("/tasks/pending");

export const deleteTask = (id) => client.delete(`/tasks/${id}`);

export const getTaskLogs = (taskId) => client.get(`/tasks/${taskId}/logs`);
