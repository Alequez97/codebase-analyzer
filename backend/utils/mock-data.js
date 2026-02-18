import fs from "fs/promises";
import path from "path";

const MOCK_DATA_ROOT = path.join(process.cwd(), ".code-analysis-example");

export async function readMockJson(pathSegments) {
  const filePath = path.join(MOCK_DATA_ROOT, ...pathSegments);
  const fileContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
}

export async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
