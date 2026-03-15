import express from "express";
import path from "path";
import fs from "fs";
import config from "../config.js";

const router = express.Router();

const designDir = () =>
  path.join(config.target.directory, ".code-analysis", "design");

/**
 * Returns available prototype versions and component previews found in
 * .code-analysis/design/.
 *
 * Prototypes  → top-level subdirectories containing an index.html
 * Components  → .html files directly inside .code-analysis/design/components/
 */
router.get("/manifest", (req, res) => {
  const base = designDir();

  if (!fs.existsSync(base)) {
    return res.json({ prototypes: [], components: [] });
  }

  const prototypes = [];
  const components = [];

  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    if (entry.name === "components") {
      const compDir = path.join(base, "components");
      for (const file of fs.readdirSync(compDir, { withFileTypes: true })) {
        if (!file.isFile() || !file.name.endsWith(".html")) continue;
        const id = file.name.replace(".html", "");
        components.push({
          id,
          label: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          url: `/design-preview/components/${file.name}`,
        });
      }
    } else {
      const indexPath = path.join(base, entry.name, "index.html");
      if (fs.existsSync(indexPath)) {
        prototypes.push({
          id: entry.name,
          label: entry.name.toUpperCase(),
          url: `/design-preview/${entry.name}/index.html`,
        });
      }
    }
  }

  res.json({ prototypes, components });
});

export default router;
