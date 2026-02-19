import client from "./client";

export const getCodebaseAnalysis = () => client.get("/analysis/codebase");

export const requestCodebaseAnalysis = (executeNow = true, agent = "llm-api") =>
  client.post("/analysis/codebase/request", { executeNow, agent });

export const getFullCodebaseAnalysis = () =>
  client.get("/analysis/codebase/full");

export const saveCodebaseSummary = (summary) =>
  client.post("/analysis/codebase/summary/save", { summary });

export const getCodebaseAnalysisLogs = () =>
  client.get("/logs/codebase-analysis");
