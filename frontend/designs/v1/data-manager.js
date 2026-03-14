/**
 * Data Manager - Handles data loading and validation against contracts
 */
class DataManager {
  constructor() {
    this.data = null;
  }

  /**
   * Load data from a JSON script element
   * @param {string} elementId - ID of the script element containing JSON
   */
  async loadFromScript(elementId) {
    const scriptElement = document.getElementById(elementId);
    if (!scriptElement) {
      throw new Error(`Script element with ID '${elementId}' not found`);
    }

    try {
      this.data = JSON.parse(scriptElement.textContent);
      this.validateData();
      return this.data;
    } catch (error) {
      throw new Error(`Failed to parse data: ${error.message}`);
    }
  }

  /**
   * Load data from a JSON file
   * @param {string} filePath - Path to the JSON file
   */
  async loadFromFile(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      this.data = await response.json();
      this.validateData();
      return this.data;
    } catch (error) {
      throw new Error(`Failed to load data from ${filePath}: ${error.message}`);
    }
  }
  validateData() {
    if (!this.data) {
      throw new Error("No data loaded");
    }

    // Basic validation - check required properties
    if (!this.data.systemStatus) {
      throw new Error("Missing systemStatus in data");
    }

    if (!Array.isArray(this.data.taskStatusList)) {
      throw new Error("taskStatusList must be an array");
    }

    // Validate each task
    this.data.taskStatusList.forEach((task, index) => {
      const required = ["id", "name", "status"];
      required.forEach((field) => {
        if (!(field in task)) {
          throw new Error(`Task ${index}: missing required field '${field}'`);
        }
      });

      if (
        !["pending", "running", "completed", "failed"].includes(task.status)
      ) {
        throw new Error(`Task ${index}: invalid status '${task.status}'`);
      }
    });
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return this.data?.systemStatus || {};
  }

  /**
   * Get task status list
   */
  getTaskStatusList() {
    return this.data?.taskStatusList || [];
  }

  /**
   * Get task by ID
   * @param {string} taskId
   */
  getTaskById(taskId) {
    return this.getTaskStatusList().find((task) => task.id === taskId);
  }

  /**
   * Get tasks by status
   * @param {string} status
   */
  getTasksByStatus(status) {
    return this.getTaskStatusList().filter((task) => task.status === status);
  }
}

// Global instance
window.dataManager = new DataManager();
