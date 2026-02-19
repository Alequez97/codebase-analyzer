import client from "./client";

export const getDomainTesting = (id) =>
  client.get(`/analysis/domain/${id}/testing`);

export const analyzeDomainTesting = (id, files, executeNow = true) =>
  client.post(`/analysis/domain/${id}/analyze/testing`, {
    files,
    executeNow,
  });

export const applyTest = (domainId, testId) =>
  client.post(`/analysis/domain/${domainId}/tests/${testId}/apply`);
