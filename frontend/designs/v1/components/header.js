/**
 * Header Component - Manages header interactions and status updates
 */
class HeaderComponent {
  constructor() {
    this.apiStatusElement = document.getElementById("api-status");
    this.socketStatusElement = document.getElementById("socket-status");
    this.tasksPillElement = document.getElementById("tasks-pill");
    this.logsBtn = document.getElementById("logs-btn");

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateStatus();
  }

  setupEventListeners() {
    // Logo button - could navigate to main app
    const logoBtn = document.querySelector(".logo-btn");
    logoBtn?.addEventListener("click", () => {
      console.log("Navigate to main app");
    });

    // Logs button
    this.logsBtn?.addEventListener("click", () => {
      this.toggleLogs();
    });
  }

  updateStatus() {
    const systemStatus = window.dataManager.getSystemStatus();

    // Update API status
    this.updateStatusBadge(this.apiStatusElement, systemStatus.api);

    // Update Socket status
    this.updateStatusBadge(this.socketStatusElement, systemStatus.socket);

    // Update tasks pill
    this.updateTasksPill(systemStatus);
  }

  updateStatusBadge(element, status) {
    if (!element) return;

    // Remove existing classes
    element.classList.remove("success", "error", "warning", "info", "neutral");

    // Update text and class
    switch (status) {
      case "connected":
        element.classList.add("success");
        element.innerHTML = '<span class="dot"></span>Connected';
        break;
      case "disconnected":
        element.classList.add("error");
        element.innerHTML = '<span class="dot"></span>Disconnected';
        break;
      case "connecting":
        element.classList.add("warning");
        element.innerHTML = '<span class="dot"></span>Connecting...';
        break;
      default:
        element.classList.add("neutral");
        element.innerHTML = '<span class="dot"></span>Unknown';
    }
  }

  updateTasksPill(systemStatus) {
    if (!this.tasksPillElement) return;

    const running = systemStatus.runningTasks || 0;
    const total = systemStatus.totalTasks || 0;

    this.tasksPillElement.textContent = `${running} running`;

    // Update badge color based on running tasks
    this.tasksPillElement.classList.remove("info", "warning", "success");
    if (running > 0) {
      this.tasksPillElement.classList.add("warning");
    } else if (total > 0) {
      this.tasksPillElement.classList.add("success");
    } else {
      this.tasksPillElement.classList.add("info");
    }
  }

  toggleLogs() {
    // This would typically show/hide a logs panel
    console.log("Toggle logs panel");
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.headerComponent = new HeaderComponent();
});
