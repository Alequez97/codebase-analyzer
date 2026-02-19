import client from "./client";

export const getProjectFiles = () => client.get("/project/files");
