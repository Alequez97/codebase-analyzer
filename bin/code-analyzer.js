#!/usr/bin/env node

/**
 * Code Analyzer CLI
 *
 * Run this tool from your project directory:
 *   cd /path/to/your/project
 *   code-analyzer start
 *
 * The analyzer will:
 * - Analyze files in the current directory
 * - Create .code-analysis/ folder for output
 * - Start the web dashboard
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn } from "child_process";
import getPort from "get-port";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const command = process.argv[2] || "start";

if (command === "start") {
  const withUI = !process.argv.includes("--no-ui");

  (async () => {
    console.log("");
    console.log("🔍 Code Analyzer Starting...");
    console.log("");
    console.log("📁 Analyzing project in:", process.cwd());
    if (!withUI) {
      console.log("⚠️  UI disabled (--no-ui flag)");
    }
    console.log("");
    console.log("🔌 Finding available ports...");

    // Find available ports
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

    // Set environment variable for the project being analyzed
    process.env.ANALYSIS_TARGET_DIR = process.cwd();

    const processes = [];

    // Start the backend server
    const backendPath = join(__dirname, "..", "backend", "index.js");

    const backend = spawn("node", [backendPath], {
      stdio: "inherit",
      env: {
        ...process.env,
        ANALYSIS_TARGET_DIR: process.cwd(),
        PORT: backendPort.toString(),
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

    // Start the frontend if UI is enabled
    let frontend;
    if (withUI) {
      const frontendPath = join(__dirname, "..", "frontend");

      frontend = spawn(
        "npm",
        ["run", "dev", "--", "--port", frontendPort.toString()],
        {
          cwd: frontendPath,
          stdio: "inherit",
          shell: true,
          env: {
            ...process.env,
            VITE_API_URL: `http://localhost:${backendPort}/api`,
          },
        },
      );

      processes.push(frontend);

      frontend.on("error", (err) => {
        console.error("Failed to start frontend:", err);
      });
    }

    // Handle Ctrl+C
    process.on("SIGINT", () => {
      console.log("\n\n👋 Shutting down Code Analyzer...\n");
      processes.forEach((p) => p.kill());
      process.exit(0);
    });
  })();
} else if (command === "help" || command === "--help" || command === "-h") {
  console.log(`
Code Analyzer - AI-powered codebase analysis tool

Usage:
  code-analyzer start [options]  Start the analyzer for current directory
  code-analyzer help             Show this help message

Options:
  --no-ui                        Start backend only (no web dashboard)

Examples:
  cd /path/to/your/project
  code-analyzer start            # Start with web UI
  code-analyzer start --no-ui    # Backend API only

The analyzer will create a .code-analysis/ folder in your project
and start a web dashboard at http://localhost:5173 (Vite dev server)
  `);
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Run "code-analyzer help" for usage information');
  process.exit(1);
}
