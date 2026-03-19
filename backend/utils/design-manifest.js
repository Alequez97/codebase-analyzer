import fs from "fs";
import path from "path";
import config from "../config.js";
import { slugifyDesignPageId } from "../tasks/queue/design-shared.js";

function designDir() {
  return path.join(config.target.directory, ".code-analysis", "design");
}

function formatLabel(id) {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export function loadDesignManifest() {
  const base = designDir();

  if (!fs.existsSync(base)) {
    return { prototypes: [], components: [] };
  }

  const prototypes = [];
  const components = [];

  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name === "components") {
      const componentsDir = path.join(base, "components");
      for (const file of fs.readdirSync(componentsDir, { withFileTypes: true })) {
        if (!file.isFile() || !file.name.endsWith(".html")) {
          continue;
        }

        const id = file.name.replace(".html", "");
        components.push({
          id,
          label: formatLabel(id),
          url: `/design-preview/components/${file.name}`,
        });
      }
      continue;
    }

    const manifestPath = path.join(base, entry.name, "app-manifest.json");
    const appManifest = readJsonIfExists(manifestPath);

    if (appManifest?.pages?.length) {
      for (const page of appManifest.pages) {
        const pageId = slugifyDesignPageId(page.id || page.name);
        const indexPath = path.join(base, entry.name, "pages", pageId, "index.html");
        if (!fs.existsSync(indexPath)) {
          continue;
        }

        prototypes.push({
          id: `${entry.name}:${pageId}`,
          label: page.name || formatLabel(pageId),
          url: `/design-preview/${entry.name}/pages/${pageId}/index.html`,
          designId: entry.name,
          pageId,
        });
      }
      continue;
    }

    const indexPath = path.join(base, entry.name, "index.html");
    if (fs.existsSync(indexPath)) {
      prototypes.push({
        id: entry.name,
        label: formatLabel(entry.name),
        url: `/design-preview/${entry.name}/index.html`,
        designId: entry.name,
        pageId: null,
      });
    }
  }

  prototypes.sort((a, b) => a.label.localeCompare(b.label));
  components.sort((a, b) => a.label.localeCompare(b.label));

  return { prototypes, components };
}
