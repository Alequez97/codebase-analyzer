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
    const raw = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizePreviewUrl(designId, relativePath) {
  const normalizedPath = String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "");

  return `/design-preview/${designId}/${normalizedPath}`;
}

function resolvePreviewEntry(base, designId) {
  const manifestPath = path.join(base, designId, "app-manifest.json");
  const appManifest = readJsonIfExists(manifestPath);

  if (appManifest?.preview?.entryHtml) {
    const previewPath = path.join(base, designId, appManifest.preview.entryHtml);
    if (fs.existsSync(previewPath)) {
      return {
        indexPath: previewPath,
        url: normalizePreviewUrl(designId, appManifest.preview.entryHtml),
        appManifest,
      };
    }
  }

  let indexPath = path.join(base, designId, "index.html");
  let url = `/design-preview/${designId}/index.html`;

  if (fs.existsSync(indexPath)) {
    return { indexPath, url, appManifest };
  }

  if (appManifest?.pages?.length) {
    const firstPage = appManifest.pages[0];
    const pageId = slugifyDesignPageId(firstPage.id || firstPage.name);
    indexPath = path.join(base, designId, "pages", pageId, "index.html");
    url = `/design-preview/${designId}/pages/${pageId}/index.html`;

    if (fs.existsSync(indexPath)) {
      return { indexPath, url, appManifest };
    }
  }

  return null;
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

    const previewEntry = resolvePreviewEntry(base, entry.name);

    if (previewEntry) {
      versions.push({
        id: entry.name,
        label: formatVersionLabel(entry.name),
        url: previewEntry.url,
        designId: entry.name,
        designLabel: formatVersionLabel(entry.name),
        pageId: null,
        prototypeType: previewEntry.appManifest?.prototypeType ?? "static-html",
        previewType: previewEntry.appManifest?.preview?.type ?? "static-html",
        previewEntryHtml: previewEntry.appManifest?.preview?.entryHtml ?? null,
        needsServerBuild:
          previewEntry.appManifest?.prototypeType === "react-static-build" ||
          previewEntry.appManifest?.preview?.type === "static-dist",
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
