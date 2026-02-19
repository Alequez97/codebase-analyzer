import client from "./client";

export const getDomainRequirements = (id) =>
  client.get(`/analysis/domain/${id}/requirements`);

export const analyzeDomainRequirements = (
  id,
  files,
  userContext = "",
  includeDocumentation = false,
  executeNow = true,
) =>
  client.post(`/analysis/domain/${id}/analyze/requirements`, {
    files,
    userContext,
    includeDocumentation,
    executeNow,
  });

export const saveRequirements = (id, domainName, requirements) =>
  client.post(`/analysis/domain/${id}/requirements/save`, {
    domainName,
    requirements,
  });
