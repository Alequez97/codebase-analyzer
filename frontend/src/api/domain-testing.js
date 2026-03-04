import client from "./client";
import { SECTION_TYPES } from "../constants/section-types";

export const getDomainTesting = (id) =>
  client.get(`/analysis/domain/${id}/${SECTION_TYPES.REFACTORING_AND_TESTING}`);

export const analyzeDomainTesting = (
  id,
  files,
  includeRequirements = false,
  executeNow = true,
) =>
  client.post(
    `/analysis/domain/${id}/analyze/${SECTION_TYPES.REFACTORING_AND_TESTING}`,
    {
      files,
      includeRequirements,
      executeNow,
    },
  );

export const applyTest = (domainId, testId) =>
  client.post(`/analysis/domain/${domainId}/tests/${testId}/apply`);

export const applyTestEdits = (domainId, testId) =>
  client.post(`/analysis/domain/${domainId}/tests/${testId}/edit`);

export const applyRefactoring = (domainId, refactoringId) =>
  client.post(
    `/analysis/domain/${domainId}/refactorings/${refactoringId}/apply`,
  );

export const markRefactoringApplied = (domainId, refactoringId) =>
  client.post(
    `/analysis/domain/${domainId}/refactorings/${refactoringId}/mark-applied`,
  );

export const unblockTest = (domainId, testId) =>
  client.post(`/analysis/domain/${domainId}/tests/${testId}/unblock`);
