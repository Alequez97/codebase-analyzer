import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendPort = process.env.BACKEND_PORT;
if (!backendPort) {
  throw new Error(
    "BACKEND_PORT env var is not set. Start the app via the CLI: code-analyzer start",
  );
}

const frontendPort = process.env.FRONTEND_PORT;
if (!frontendPort) {
  throw new Error(
    "FRONTEND_PORT env var is not set. Start the app via the CLI: code-analyzer start",
  );
}

const backendTarget = `http://localhost:${backendPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(frontendPort, 10),
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
      "/socket.io": {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
