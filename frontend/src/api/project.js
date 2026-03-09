import client from "./client";

export const getProjectFiles = () => client.get("/project/files");

export const openFileInEditor = (path, line, column) =>
  client.post("/project/open-in-editor", {
    path,
    line,
    column,
  });
