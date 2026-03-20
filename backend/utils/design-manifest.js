import fs from "fs";
import path from "path";
import config from "../config.js";
import { slugifyDesignPageId } from "../tasks/queue/design/shared.js";

function designDir() {
  return path.join(config.target.directory, ".code-analysis", "design");
}

function formatLabel(id) {
  return id.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatVersionLabel(designId) {
  // Format v1, v2, v3 etc as "Version 1", "Version 2", "Version 3"
  const versionMatch = designId.match(/^v(\d+)$/);
  if (versionMatch) {
    return `Version ${versionMatch[1]}`;
  }
  return formatLabel(designId);
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
    return { versions: [] };
  }

  const versions = [];

  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    // First check for root index.html
    let indexPath = path.join(base, entry.name, "index.html");
    let url = `/design-preview/${entry.name}/index.html`;

    // If no root index.html, check for first page's index.html
    if (!fs.existsSync(indexPath)) {
      const manifestPath = path.join(base, entry.name, "app-manifest.json");
      const appManifest = readJsonIfExists(manifestPath);

      if (appManifest?.pages?.length) {
        const firstPage = appManifest.pages[0];
        const pageId = slugifyDesignPageId(firstPage.id || firstPage.name);
        indexPath = path.join(base, entry.name, "pages", pageId, "index.html");
        url = `/design-preview/${entry.name}/pages/${pageId}/index.html`;
      }
    }

    // Only add version if we found an index.html
    if (fs.existsSync(indexPath)) {
      versions.push({
        id: entry.name,
        label: formatVersionLabel(entry.name),
        url,
        designId: entry.name,
        designLabel: formatVersionLabel(entry.name),
        pageId: null,
      });
    }
  }

  // Sort versions: v1, v2, v3, etc., then alphabetically by other names
  versions.sort((a, b) => {
    const aVersion = a.designId.match(/^v(\d+)$/);
    const bVersion = b.designId.match(/^v(\d+)$/);

    if (aVersion && bVersion) {
      return parseInt(aVersion[1]) - parseInt(bVersion[1]);
    }
    if (aVersion) return -1; // v1, v2 come before other names
    if (bVersion) return 1;
    return a.label.localeCompare(b.label);
  });

  return { versions };
}

