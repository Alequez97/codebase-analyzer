import client from "./client";

export const getDomainBugsSecurity = (id) =>
  client.get(`/analysis/domain/${id}/bugs-security`);

export const analyzeDomainBugsSecurity = (
  id,
  files,
  includeRequirements = false,
  executeNow = true,
) =>
  client.post(`/analysis/domain/${id}/analyze/bugs-security`, {
    files,
    includeRequirements,
    executeNow,
  });

export const recordFindingAction = (
  domainId,
  findingId,
  action,
  reason = "",
  metadata = {},
) =>
  client.post(
    `/analysis/domain/${domainId}/bugs-security/findings/${findingId}/actions`,
    {
      action,
      reason,
      metadata,
    },
  );
