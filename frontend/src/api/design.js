import client from "./client";

export const getDesignManifest = () => client.get("/design/manifest");

export const brainstormDesign = ({ prompt, history = [] }) =>
  client.post("/design/brainstorm", { prompt, history });

export const generateDesign = ({ prompt, brief, history = [], designId = null }) =>
  client.post("/design/generate", { prompt, brief, history, designId });
