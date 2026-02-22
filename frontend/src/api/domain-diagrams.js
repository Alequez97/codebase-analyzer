import apiClient from "./client";

/**
 * Get domain diagrams metadata
 */
export const getDomainDiagrams = (domainId) =>
  apiClient.get(`/analysis/domain/${domainId}/diagrams`);

/**
 * Get a specific diagram file content
 */
export const getDiagramFile = (domainId, fileName) =>
  apiClient.get(`/analysis/domain/${domainId}/diagrams/${fileName}`);

/**
 * Get diagram file URL for viewer
 */
export function getDiagramFileUrl(domainId, fileName) {
  return `${apiClient.defaults.baseURL}/analysis/domain/${domainId}/diagrams/${fileName}`;
}

/**
 * Analyze domain diagrams section
 */
export async function analyzeDomainDiagrams(
  domainId,
  files,
  includeDocumentation = true,
  executeNow = true,
) {
  const response = await apiClient.post(
    `/analysis/domain/${domainId}/analyze/diagrams`,
    {
      files,
      includeDocumentation,
      executeNow,
    },
  );
  return response.data;
}

/**
 * Save edited diagrams metadata
 */
export async function saveDomainDiagrams(domainId, diagrams) {
  const response = await apiClient.put(
    `/analysis/domain/${domainId}/diagrams`,
    {
      diagrams,
    },
  );
  return response.data;
}

/**
 * Open diagram file in VS Code editor
 */
export async function openDiagramInEditor(domainId, fileName) {
  const response = await apiClient.post(
    `/analysis/domain/${domainId}/diagrams/${fileName}/open-in-editor`,
  );
  return response.data;
}
