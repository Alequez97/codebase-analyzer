import ngrok from "@ngrok/ngrok";
import * as logger from "./logger.js";

/**
 * NgrokManager - Manages ngrok tunnels for design preview sharing
 *
 * Maintains a map of active tunnels per design ID to enable
 * public sharing of design previews.
 */
class NgrokManager {
  constructor() {
    /** @type {Map<string, { listener: any, url: string }>} */
    this.activeTunnels = new Map();
    this.isShuttingDown = false;
  }

  /**
   * Start a tunnel for a specific design preview
   * @param {string} designId - The design ID to create a tunnel for
   * @param {number} port - The local port where the backend is running
   * @returns {Promise<string>} The public ngrok URL
   */
  async startTunnel(designId, port) {
    // Check if tunnel already exists
    if (this.activeTunnels.has(designId)) {
      const existing = this.activeTunnels.get(designId);
      logger.info("Tunnel already exists for design", {
        component: "NgrokManager",
        designId,
        url: existing.url,
      });
      return existing.url;
    }

    try {
      logger.info("Starting ngrok tunnel", {
        component: "NgrokManager",
        designId,
        port,
      });

      // Create tunnel pointing to the local backend with specific path
      const listener = await ngrok.forward({
        addr: port,
        authtoken_from_env: true, // Uses NGROK_AUTHTOKEN env var if available
      });

      const url = listener.url();
      const publicUrl = `${url}/design-preview/${designId}`;

      this.activeTunnels.set(designId, { listener, url: publicUrl });

      logger.info("Ngrok tunnel started successfully", {
        component: "NgrokManager",
        designId,
        url: publicUrl,
      });

      return publicUrl;
    } catch (error) {
      logger.error("Failed to start ngrok tunnel", {
        component: "NgrokManager",
        designId,
        error: error.message,
        stack: error.stack,
      });

      // Provide helpful error message for authentication issues
      if (
        error.message.includes("ERR_NGROK_4018") ||
        error.message.includes("verified account")
      ) {
        throw new Error(
          "Ngrok requires authentication. Please:\n" +
            "1. Sign up at https://dashboard.ngrok.com/signup\n" +
            "2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken\n" +
            "3. Add NGROK_AUTHTOKEN=your_token_here to backend/.env",
        );
      }

      throw new Error(`Failed to start ngrok tunnel: ${error.message}`);
    }
  }

  /**
   * Stop a tunnel for a specific design
   * @param {string} designId - The design ID to stop the tunnel for
   * @returns {Promise<boolean>} True if tunnel was stopped, false if it didn't exist
   */
  async stopTunnel(designId) {
    const tunnel = this.activeTunnels.get(designId);
    if (!tunnel) {
      logger.warn("No tunnel found to stop", {
        component: "NgrokManager",
        designId,
      });
      return false;
    }

    try {
      logger.info("Stopping ngrok tunnel", {
        component: "NgrokManager",
        designId,
        url: tunnel.url,
      });

      await tunnel.listener.close();
      this.activeTunnels.delete(designId);

      logger.info("Ngrok tunnel stopped", {
        component: "NgrokManager",
        designId,
      });

      return true;
    } catch (error) {
      logger.error("Failed to stop ngrok tunnel", {
        component: "NgrokManager",
        designId,
        error: error.message,
        stack: error.stack,
      });
      this.activeTunnels.delete(designId); // Remove from map even if close failed
      return false;
    }
  }

  /**
   * Get the URL for an active tunnel
   * @param {string} designId
   * @returns {string|null}
   */
  getTunnelUrl(designId) {
    const tunnel = this.activeTunnels.get(designId);
    return tunnel ? tunnel.url : null;
  }

  /**
   * Get all active tunnel URLs
   * @returns {Map<string, string>} Map of designId -> url
   */
  getAllTunnels() {
    const result = new Map();
    for (const [designId, { url }] of this.activeTunnels.entries()) {
      result.set(designId, url);
    }
    return result;
  }

  /**
   * Stop all active tunnels (called on app shutdown)
   */
  async stopAllTunnels() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    logger.info("Stopping all ngrok tunnels", {
      component: "NgrokManager",
      count: this.activeTunnels.size,
    });

    const stopPromises = [];
    for (const designId of this.activeTunnels.keys()) {
      stopPromises.push(this.stopTunnel(designId));
    }

    await Promise.allSettled(stopPromises);

    logger.info("All ngrok tunnels stopped", {
      component: "NgrokManager",
    });
  }
}

// Singleton instance
const ngrokManager = new NgrokManager();

// Cleanup on process exit
process.on("SIGINT", async () => {
  await ngrokManager.stopAllTunnels();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await ngrokManager.stopAllTunnels();
  process.exit(0);
});

export default ngrokManager;
