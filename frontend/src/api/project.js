import client from "./client";

export const getProjectFiles = () => client.get("/project/files");

export const getProjectBranches = () => client.get("/project/branches");

export const openFileInEditor = (path, line, column) =>
  client.post("/project/open-in-editor", {
    path,
    line,
    column,
  });

export const getFileSnippet = (filePath, from, to) => {
  const params = new URLSearchParams({ path: filePath });
  if (from != null) params.append("from", from);
  if (to != null) params.append("to", to);
  return client.get(`/project/file-snippet?${params.toString()}`);
};
