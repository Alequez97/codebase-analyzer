/**
 * Main Application Entry Point
 * Initializes all components and manages application lifecycle
 */
class App {
  constructor() {
    this.initialized = false;
  }

  async init() {
    try {
      // Load data first
      await window.dataManager.loadFromFile("./data/mock-data.json");

      // Initialize components (they will auto-initialize via DOMContentLoaded)
      console.log("Design System v1 initialized successfully");

      this.initialized = true;

      // Set up any global event listeners or periodic updates
      this.setupGlobalListeners();
    } catch (error) {
      console.error("Failed to initialize app:", error);
      this.showError("Failed to load application data");
    }
  }

  setupGlobalListeners() {
    // Example: Periodic status updates (simulated)
    setInterval(() => {
      if (this.initialized) {
        // In a real app, this would fetch updated data
        this.simulateStatusUpdates();
      }
    }, 5000); // Update every 5 seconds
  }

  simulateStatusUpdates() {
    // Simulate progress updates for running tasks
    const runningTasks = window.dataManager.getTasksByStatus("running");

    runningTasks.forEach((task) => {
      const currentProgress = task.progress;
      if (currentProgress < 100) {
        const newProgress = Math.min(currentProgress + Math.random() * 10, 100);
        window.tasksStatusComponent.updateTask(task.id, {
          progress: Math.round(newProgress),
        });

        // If progress reaches 100, mark as completed
        if (newProgress >= 100) {
          window.tasksStatusComponent.updateTask(task.id, {
            status: "completed",
            endTime: new Date().toISOString(),
          });
        }
      }
    });
  }

  showError(message) {
    // Simple error display - in a real app, you'd have a proper error component
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--color-error-bg);
      color: var(--color-error);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid var(--color-error);
      z-index: 9999;
      max-width: 300px;
    `;
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
  window.app.init();
});
