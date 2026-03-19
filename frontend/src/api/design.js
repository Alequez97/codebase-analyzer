import client from "./client";

export const getDesignManifest = () => client.get("/design/manifest");

export const getLatestDesignTask = () => client.get("/design/latest-task");

export const brainstormDesign = ({ prompt, history = [], model = null }) =>
  client.post("/design/brainstorm", { prompt, history, model });

export const generateDesign = ({
  prompt,
  brief,
  history = [],
  designId = null,
  model = null,
}) =>
  client.post("/design/generate", { prompt, brief, history, designId, model });

