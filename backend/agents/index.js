import config from '../config.js';
import * as aider from './aider.js';
import * as tasksPersistence from '../persistence/tasks.js';

/**
 * Get available agent based on config and detection
 * @returns {Promise<Object>} Agent module with detect() and execute() functions
 */
async function getAgent() {
  const tool = config.analysisTool;
  
  switch (tool) {
    case 'aider':
      return aider;
    
    // Future agents
    case 'claude-code':
      throw new Error('Claude Code agent not yet implemented');
    
    case 'gemini':
      throw new Error('Gemini agent not yet implemented');
    
    case 'codex':
      throw new Error('Codex agent not yet implemented');
    
    default:
      // Auto-detect
      if (await aider.detect()) {
        return aider;
      }
      
      throw new Error('No AI agent available. Please install Aider or configure ANALYSIS_TOOL');
  }
}

/**
 * Execute a task using the configured agent
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} Execution result
 */
export async function executeTask(taskId) {
  const task = await tasksPersistence.readTask(taskId);
  
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  if (task.status !== 'pending') {
    throw new Error(`Task ${taskId} is not pending (status: ${task.status})`);
  }
  
  const agent = await getAgent();
  const result = await agent.execute(task);
  
  if (result.success) {
    // Move task to completed
    await tasksPersistence.moveToCompleted(taskId);
  }
  
  return result;
}

/**
 * Detect which agents are available
 * @returns {Promise<Object>} Available agents
 */
export async function detectAvailableAgents() {
  return {
    aider: await aider.detect(),
    // Add more detections as we implement more agents
  };
}
