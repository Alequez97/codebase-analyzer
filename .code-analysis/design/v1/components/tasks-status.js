/**
 * Tasks Status Component - Manages task status display and updates
 */
class TasksStatusComponent {
  constructor() {
    this.tasksGrid = document.getElementById("tasks-grid");
    this.tasks = [];

    this.init();
  }

  init() {
    // Wait for data to be loaded before rendering
    this.waitForDataAndRender();
  }

  async waitForDataAndRender() {
    // Wait for dataManager to be initialized and have data
    while (!window.dataManager || !window.dataManager.data) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.loadTasks();
    this.render();
  }

  loadTasks() {
    this.tasks = window.dataManager.getTaskStatusList();
  }

  render() {
    if (!this.tasksGrid) return;

    this.tasksGrid.innerHTML = "";

    this.tasks.forEach((task) => {
      const taskCard = this.createTaskCard(task);
      this.tasksGrid.appendChild(taskCard);
    });
  }

  createTaskCard(task) {
    const card = document.createElement("div");
    card.className = "task-card";
    card.dataset.taskId = task.id;

    card.innerHTML = `
      <div class="task-header">
        <div class="task-title">${this.escapeHtml(task.name)}</div>
        <div class="task-status">
          ${this.createStatusBadge(task.status)}
        </div>
      </div>
      <div class="task-body">
        <div class="task-progress">
          <div class="progress-bar">
            <div class="progress-fill ${task.status}" style="width: ${task.progress}%"></div>
          </div>
          <div class="progress-text">${task.progress}% complete</div>
        </div>
        <div class="task-details">
          <div class="detail-item">
            <div class="detail-label">Started</div>
            <div class="detail-value">${this.formatDateTime(task.startTime)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Duration</div>
            <div class="detail-value">${this.calculateDuration(task)}</div>
          </div>
        </div>
        ${task.error ? this.createErrorSection(task.error) : ""}
      </div>
    `;

    return card;
  }

  createStatusBadge(status) {
    const statusConfig = {
      pending: { class: "neutral", text: "Pending" },
      running: { class: "info", text: "Running" },
      completed: { class: "success", text: "Completed" },
      failed: { class: "error", text: "Failed" },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return `<span class="badge ${config.class}">
      <span class="dot"></span>
      ${config.text}
    </span>`;
  }

  createErrorSection(error) {
    return `
      <div class="task-error">
        <div class="task-error-message">${this.escapeHtml(error)}</div>
      </div>
    `;
  }

  formatDateTime(dateTime) {
    if (!dateTime) return "Not started";

    try {
      const date = new Date(dateTime);
      return date.toLocaleString();
    } catch (error) {
      return "Invalid date";
    }
  }

  calculateDuration(task) {
    if (!task.startTime) return "Not started";

    const start = new Date(task.startTime);
    const end = task.endTime ? new Date(task.endTime) : new Date();

    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Method to update a specific task
  updateTask(taskId, updates) {
    const taskIndex = this.tasks.findIndex((task) => task.id === taskId);
    if (taskIndex === -1) return;

    this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
    this.render();
  }

  // Method to add a new task
  addTask(task) {
    this.tasks.push(task);
    this.render();
  }

  // Method to remove a task
  removeTask(taskId) {
    this.tasks = this.tasks.filter((task) => task.id !== taskId);
    this.render();
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.tasksStatusComponent = new TasksStatusComponent();
});
