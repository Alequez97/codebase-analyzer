import express from "express";
import { readE2EConfig, writeE2EConfig } from "../persistence/e2e-config.js";

const router = express.Router();

/**
 * GET /api/e2e-config
 * Returns the current e2e test configuration
 */
router.get("/", async (req, res) => {
  const config = await readE2EConfig();
  res.json(config);
});

/**
 * PUT /api/e2e-config
 * Saves e2e test configuration
 * Body: { baseUrl, auth: { username, password } }
 */
router.put("/", async (req, res) => {
  const { baseUrl, auth } = req.body;

  if (!baseUrl || typeof baseUrl !== "string") {
    return res.status(400).json({ error: "baseUrl is required" });
  }

  const data = {
    baseUrl: baseUrl.trim(),
    auth: {
      username: auth?.username?.trim() || "",
      password: auth?.password || "",
    },
  };

  await writeE2EConfig(data);
  res.json(data);
});

export default router;
