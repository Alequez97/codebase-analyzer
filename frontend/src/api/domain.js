import client from "./client";

export const getDomain = (id) => client.get(`/analysis/domain/${id}`);

export const getDomainFiles = (id) =>
  client.get(`/analysis/domain/${id}/files`);

export const saveDomainFiles = (id, files) =>
  client.post(`/analysis/domain/${id}/files/save`, { files });

export const getDomainSectionLogs = (domainId, section) =>
  client.get(`/analysis/domain/${domainId}/logs/${section}`);
