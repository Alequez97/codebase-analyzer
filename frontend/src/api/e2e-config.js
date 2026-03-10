import client from "./client";

export const getE2EConfig = () => client.get("/e2e-config");

export const saveE2EConfig = (data) => client.put("/e2e-config", data);
