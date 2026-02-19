import client from "./client";

export const getStatus = () => client.get("/status");
