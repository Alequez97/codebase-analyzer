import client from "./client";

export const getDomainDocumentation = (id) =>
  client.get(`/analysis/domain/${id}/documentation`);

export const analyzeDomainDocumentation = (id, files, executeNow = true) =>
  client.post(`/analysis/domain/${id}/analyze/documentation`, {
    files,
    executeNow,
  });

export const saveDocumentation = (id, documentation) =>
  client.post(`/analysis/domain/${id}/documentation/save`, { documentation });
