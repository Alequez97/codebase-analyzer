import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';

const execAsync = promisify(exec);

/**
 * Detect if Aider is installed and accessible
 * @returns {Promise<boolean>} True if Aider is available
 */
export async function detect() {
  try {
    const { stdout } = await execAsync('aider --version');
    console.log(`Aider detected: ${stdout.trim()}`);
    return true;
  } catch (error) {
    console.log('Aider not detected');
    return false;
  }
}

/**
 * Execute a task using Aider
 * @param {Object} task - The task object
 * @returns {Promise<Object>} Execution result
 */
export async function execute(task) {
  const isAvailable = await detect();
  
  if (!isAvailable) {
    throw new Error('Aider is not installed or not in PATH');
  }

  // Read instruction file
  const instructionPath = path.join(config.paths.root, task.instructionFile);
  const instruction = await fs.readFile(instructionPath, 'utf-8');

  // Build file list for Aider to work with
  const files = task.params.files || [];
  const filesArg = files.map(f => `"${path.join(task.params.codebasePath, f)}"`).join(' ');

  // Build Aider command
  const command = [
    'aider',
    '--yes-always',
    '--message-file', `"${instructionPath}"`,
    filesArg,
  ].filter(Boolean).join(' ');

  console.log(`Executing Aider: ${command}`);

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: task.params.codebasePath,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return {
      success: true,
      stdout,
      stderr,
      taskId: task.id,
    };
  } catch (error) {
    console.error(`Aider execution failed for task ${task.id}:`, error);
    
    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
      taskId: task.id,
    };
  }
}
