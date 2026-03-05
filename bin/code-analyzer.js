#!/usr/bin/env node

/**
 * Code Analyzer CLI
 *
 * Run from your project directory:
 *   cd /path/to/your/project
 *   code-analyzer
 *
 * Flags:
 *   --no-ui     Start backend only (no web dashboard)
 *   --watch     Enable hot reload (restarts on code changes)
 *   --help      Show usage information
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn } from "child_process";
import getPort from "get-port";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Code Analyzer - AI-powered codebase analysis tool

Usage:
  cd /path/to/your/project
  code-analyzer [options]

Options:
  --no-ui     Start backend only (no web dashboard)
  --watch     Enable hot reload (restarts on code changes)
  --help      Show this help message
  `);
  process.exit(0);
}

const withUI = !args.includes("--no-ui");
const withWatch = args.includes("--watch");

(async () => {
  console.log("");
  console.log("🔍 Code Analyzer Starting...");
  console.log("");
  console.log("📁 Analyzing project in:", process.cwd());
  if (!withUI) {
    console.log("⚠️  UI disabled (--no-ui)");
  }
  if (withWatch) {
    console.log("🔄 Hot reload enabled (--watch)");
  }
  console.log("");
  console.log("🔌 Finding available ports...");

  const backendPort = await getPort({
    port: [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010],
  });
  const frontendPort = withUI
    ? await getPort({
        port: [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180],
      })
    : null;

  console.log(`   Backend API: ${backendPort}`);
  if (withUI) {
    console.log(`   Frontend UI: ${frontendPort}`);
  }
  console.log("");

  const processes = [];

  // Start backend
  const backendPath = join(__dirname, "..", "backend", "index.js");
  const nodeArgs = withWatch ? ["--watch", backendPath] : [backendPath];

  const backend = spawn("node", nodeArgs, {
    stdio: "inherit",
    env: {
      ...process.env,
      ANALYSIS_TARGET_DIR: process.cwd(),
      PORT: backendPort.toString(),
      FRONTEND_PORT: frontendPort ? frontendPort.toString() : "",
    },
  });

  processes.push(backend);

  backend.on("error", (err) => {
    console.error("Failed to start backend:", err);
    process.exit(1);
  });

  backend.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Backend exited with code ${code}`);
      processes.forEach((p) => p.kill());
      process.exit(code);
    }
  });

  // Start frontend
  if (withUI) {
    const frontendPath = join(__dirname, "..", "frontend");

    const frontend = spawn(
      "npm",
      ["run", "dev", "--", "--port", frontendPort.toString()],
      {
        cwd: frontendPath,
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          BACKEND_PORT: backendPort.toString(),
          FRONTEND_PORT: frontendPort.toString(),
          DISABLE_HMR: withWatch ? "false" : "true",
        },
      },
    );

    processes.push(frontend);

    frontend.on("error", (err) => {
      console.error("Failed to start frontend:", err);
    });
  }

  process.on("SIGINT", () => {
    console.log("\n\n👋 Shutting down Code Analyzer...\n");
    processes.forEach((p) => p.kill());
    process.exit(0);
  });
})();
