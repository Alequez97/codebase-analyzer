import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';

/**
 * Read a task from pending or completed
 * @param {string} taskId - The task ID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
export async function readTask(taskId) {
  try {
    const pendingPath = path.join(config.paths.analysisOutput, 'tasks', 'pending', `${taskId}.json`);
    const content = await fs.readFile(pendingPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Try completed
      try {
        const completedPath = path.join(config.paths.analysisOutput, 'tasks', 'completed', `${taskId}.json`);
        const content = await fs.readFile(completedPath, 'utf-8');
        return JSON.parse(content);
      } catch (err) {
        if (err.code === 'ENOENT') {
          return null;
        }
        throw err;
      }
    }
    throw error;
  }
}

/**
 * Write task to pending directory
 * @param {Object} task - The task object
 */
export async function writeTask(task) {
  const filePath = path.join(config.paths.analysisOutput, 'tasks', 'pending', `${task.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(task, null, 2), 'utf-8');
}

/**
 * List all pending tasks
 * @returns {Promise<Object[]>} Array of pending task objects
 */
export async function listPending() {
  try {
    const tasksDir = path.join(config.paths.analysisOutput, 'tasks', 'pending');
    const files = await fs.readdir(tasksDir);
    
    const tasks = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          const content = await fs.readFile(path.join(tasksDir, file), 'utf-8');
          return JSON.parse(content);
        })
    );
    
    return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Move task from pending to completed
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} The completed task
 */
export async function moveToCompleted(taskId) {
  const pendingPath = path.join(config.paths.analysisOutput, 'tasks', 'pending', `${taskId}.json`);
  const completedPath = path.join(config.paths.analysisOutput, 'tasks', 'completed', `${taskId}.json`);

  const content = await fs.readFile(pendingPath, 'utf-8');
  const task = JSON.parse(content);
  task.status = 'completed';
  task.completedAt = new Date().toISOString();

  await fs.writeFile(completedPath, JSON.stringify(task, null, 2), 'utf-8');
  await fs.unlink(pendingPath);
  
  return task;
}

/**
 * Delete a task from pending or completed
 * @param {string} taskId - The task ID
 */
export async function deleteTask(taskId) {
  const pendingPath = path.join(config.paths.analysisOutput, 'tasks', 'pending', `${taskId}.json`);
  const completedPath = path.join(config.paths.analysisOutput, 'tasks', 'completed', `${taskId}.json`);

  try {
    await fs.unlink(pendingPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // Try completed
    await fs.unlink(completedPath);
  }
}
