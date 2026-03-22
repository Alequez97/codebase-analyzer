import client from "./client";

export const getDesignManifest = () => client.get("/design/manifest");

export const getLatestGenerationTask = () =>
  client.get("/design/latest-generation-task");
export const getLatestBrainstormTask = () =>
  client.get("/design/latest-brainstorm-task");

export const getLatestEditTask = () => client.get("/design/latest-edit-task");

export const brainstormDesign = ({ prompt, history = [], model = null }) =>
  client.post("/design/brainstorm", {
    prompt,
    history,
    agentsOverrides: model ? { model } : null,
  });

export const editDesign = ({ prompt, history = [], model = null }) =>
  client.post("/design/edit", {
    prompt,
    history,
    agentsOverrides: model ? { model } : null,
  });

export const generateDesign = ({
  prompt,
  brief,
  history = [],
  designId = null,
  model = null,
}) =>
  client.post("/design/generate", {
    prompt,
    brief,
    history,
    designId,
    agentsOverrides: model ? { model } : null,
  });

